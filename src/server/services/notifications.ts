import "server-only";

import { randomUUID } from "node:crypto";
import { addDays, todayISO } from "@/lib/dates";
import type { AnnouncementInput } from "@/lib/validation";
import { query, queryOne, transaction } from "@/server/db/client";
import type { MemberNotification, Notification } from "@/server/db/types";
import { writeAudit } from "@/server/audit";

export async function listNotifications(gymId: string) {
  return query<Notification>(
    `SELECT n.*,
       (SELECT COUNT(*)::int FROM notification_recipients nr WHERE nr.notification_id = n.id) AS recipient_count,
       (SELECT COUNT(*)::int FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.read_at IS NOT NULL) AS read_count
     FROM notifications n
     WHERE n.gym_id = $1
     ORDER BY n.created_at DESC
     LIMIT 100`,
    [gymId],
  );
}

export async function createAnnouncement(input: {
  gymId: string;
  actorId: string;
  data: AnnouncementInput;
}) {
  const title = input.data.title.trim();
  const body = input.data.body.trim();
  if (input.data.audience === "selected" && input.data.memberIds.length === 0) {
    throw new Error("Select at least one member for a targeted announcement.");
  }

  let recipientIds: string[] = [];
  if (input.data.audience === "all") {
    const rows = await query<{ id: string }>(
      "SELECT id FROM gym_members WHERE gym_id = $1",
      [input.gymId],
    );
    recipientIds = rows.map((row) => row.id);
  } else {
    const placeholders = input.data.memberIds.map((_, index) => `$${index + 2}`).join(", ");
    const rows = await query<{ id: string }>(
      `SELECT id FROM gym_members WHERE gym_id = $1 AND id IN (${placeholders})`,
      [input.gymId, ...input.data.memberIds],
    );
    if (rows.length !== new Set(input.data.memberIds).size) {
      throw new Error("One or more selected members do not belong to this gym.");
    }
    recipientIds = rows.map((row) => row.id);
  }

  const notificationId = randomUUID();
  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO notifications (id, gym_id, kind, title, body, audience, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [notificationId, input.gymId, input.data.kind, title, body, input.data.audience, input.actorId],
    );
    if (recipientIds.length > 0) {
      const params = recipientIds.flatMap((memberId) => [randomUUID(), notificationId, memberId]);
      const tuples = recipientIds
        .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`)
        .join(", ");
      await tx.query(
        `INSERT INTO notification_recipients (id, notification_id, member_id)
         VALUES ${tuples}`,
        params,
      );
    }
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "notification.sent",
    entityType: "notification",
    entityId: notificationId,
    metadata: { audience: input.data.audience, recipients: recipientIds.length },
  });

  return { id: notificationId, recipients: recipientIds.length };
}

export async function sendExpiryReminders(input: {
  gymId: string;
  actorId: string;
  timezone: string;
  reminderDays?: number;
}) {
  const reminderDays = Math.min(30, Math.max(1, Math.round(input.reminderDays ?? 7)));
  const today = todayISO(input.timezone);
  const until = addDays(today, reminderDays);
  const expiring = await query<{
    member_id: string;
    member_name: string;
    plan_name: string;
    end_date: string;
  }>(
    `SELECT m.member_id, p.full_name AS member_name, mp.name AS plan_name, m.end_date::text
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     JOIN gym_members gm ON gm.id = m.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE m.gym_id = $1 AND m.status = 'active' AND m.end_date BETWEEN $2 AND $3
     ORDER BY m.end_date`,
    [input.gymId, today, until],
  );

  if (expiring.length === 0) return { sent: 0 };

  const recent = await queryOne<{ id: string }>(
    `SELECT id FROM notifications
     WHERE gym_id = $1 AND kind = 'expiry' AND created_at > now() - interval '20 hours'
     ORDER BY created_at DESC LIMIT 1`,
    [input.gymId],
  );
  if (recent) return { sent: 0, skipped: true };

  const names = expiring.map((item) => item.member_name.split(" ")[0]).join(", ");
  const notificationId = randomUUID();
  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO notifications (id, gym_id, kind, title, body, audience, created_by)
       VALUES ($1, $2, 'expiry', $3, $4, 'selected', $5)`,
      [
        notificationId,
        input.gymId,
        `Your membership expires within ${reminderDays} day${reminderDays === 1 ? "" : "s"}`,
        `Your current plan is coming to an end. Renew at the front desk to keep access without interruption. Expiring members: ${names}.`,
        input.actorId,
      ],
    );
    for (const member of expiring) {
      await tx.query(
        `INSERT INTO notification_recipients (id, notification_id, member_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [randomUUID(), notificationId, member.member_id],
      );
    }
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "notification.expiry_reminders_sent",
    entityType: "notification",
    entityId: notificationId,
    metadata: { recipients: expiring.length, reminderDays },
  });

  return { sent: expiring.length };
}

export async function sendPaymentReminders(input: {
  gymId: string;
  actorId: string;
  timezone: string;
}) {
  const due = await query<{ member_id: string; amount: number }>(
    `SELECT member_id, SUM(amount_cents)::int AS amount
     FROM payments WHERE gym_id = $1 AND status IN ('pending', 'failed')
     GROUP BY member_id`,
    [input.gymId],
  );
  if (due.length === 0) return { sent: 0 };

  const notificationId = randomUUID();
  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO notifications (id, gym_id, kind, title, body, audience, created_by)
       VALUES ($1, $2, 'payment', $3, $4, 'selected', $5)`,
      [
        notificationId,
        input.gymId,
        "A quick reminder about your balance",
        "There is an outstanding balance on your account. Please settle it at reception or ask us about paying by UPI. If you have already paid, let us know and we will update your record.",
        input.actorId,
      ],
    );
    for (const member of due) {
      await tx.query(
        `INSERT INTO notification_recipients (id, notification_id, member_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [randomUUID(), notificationId, member.member_id],
      );
    }
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "notification.payment_reminders_sent",
    entityType: "notification",
    entityId: notificationId,
    metadata: { recipients: due.length },
  });

  return { sent: due.length };
}

export async function getMemberNotifications(
  gymId: string,
  memberId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
) {
  return query<MemberNotification>(
    `SELECT n.*, nr.id AS recipient_id, nr.read_at
     FROM notification_recipients nr
     JOIN notifications n ON n.id = nr.notification_id
     WHERE nr.member_id = $1 AND n.gym_id = $2
       ${options.unreadOnly ? "AND nr.read_at IS NULL" : ""}
     ORDER BY n.created_at DESC
     LIMIT $3`,
    [memberId, gymId, options.limit ?? 50],
  );
}

export async function getUnreadNotificationCount(gymId: string, memberId: string) {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM notification_recipients nr
     JOIN notifications n ON n.id = nr.notification_id
     WHERE nr.member_id = $1 AND n.gym_id = $2 AND nr.read_at IS NULL`,
    [memberId, gymId],
  );
  return row?.count ?? 0;
}

export async function markNotificationRead(input: {
  gymId: string;
  memberId: string;
  recipientId: string;
}) {
  await query(
    `UPDATE notification_recipients nr SET read_at = now()
     FROM notifications n
     WHERE nr.id = $1 AND nr.member_id = $2 AND n.id = nr.notification_id AND n.gym_id = $3
       AND nr.read_at IS NULL`,
    [input.recipientId, input.memberId, input.gymId],
  );
}

export async function markAllNotificationsRead(gymId: string, memberId: string) {
  await query(
    `UPDATE notification_recipients nr SET read_at = now()
     FROM notifications n
     WHERE nr.notification_id = n.id AND nr.member_id = $1 AND n.gym_id = $2
       AND nr.read_at IS NULL`,
    [memberId, gymId],
  );
}
