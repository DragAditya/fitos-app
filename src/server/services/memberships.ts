import "server-only";

import { randomUUID } from "node:crypto";
import { addDays } from "@/lib/dates";
import { computeEndDate, effectiveMembershipStatus } from "@/lib/membership";
import { query, queryOne, transaction } from "@/server/db/client";
import type { Membership, MembershipRow, RenewalRequest } from "@/server/db/types";
import { writeAudit } from "@/server/audit";
import { getMemberById } from "./members";

const SELECT = /* sql */ `
  SELECT m.*, mp.name AS plan_name, mp.duration_days, mp.duration_label, mp.benefits,
         p.full_name AS member_name, p.email AS member_email, gm.member_code
  FROM memberships m
  JOIN membership_plans mp ON mp.id = m.plan_id
  JOIN gym_members gm ON gm.id = m.member_id
  JOIN profiles p ON p.id = gm.profile_id
`;

export async function syncMembershipStatuses(gymId: string, today: string) {
  await transaction(async (tx) => {
    await tx.query(
      `UPDATE memberships SET status = 'completed', updated_at = now()
       WHERE gym_id = $1 AND status = 'active' AND end_date < $2`,
      [gymId, today],
    );
    await tx.query(
      `UPDATE memberships m SET status = 'active', updated_at = now()
       WHERE m.gym_id = $1 AND m.status = 'pending' AND m.start_date <= $2
         AND NOT EXISTS (SELECT 1 FROM memberships a WHERE a.member_id = m.member_id AND a.status = 'active')`,
      [gymId, today],
    );
  });
}

export async function getCurrentMembership(gymId: string, memberId: string) {
  return queryOne<MembershipRow>(
    `${SELECT}
     WHERE m.gym_id = $1 AND m.member_id = $2 AND m.status IN ('active', 'pending')
     ORDER BY CASE m.status WHEN 'active' THEN 0 ELSE 1 END, m.end_date DESC LIMIT 1`,
    [gymId, memberId],
  );
}

export async function getEligibleMembership(gymId: string, memberId: string, today: string) {
  return queryOne<MembershipRow>(
    `${SELECT}
     WHERE m.gym_id = $1 AND m.member_id = $2 AND m.status = 'active'
       AND m.start_date <= $3 AND m.end_date >= $3
     ORDER BY m.end_date DESC LIMIT 1`,
    [gymId, memberId, today],
  );
}

export async function getMembershipById(gymId: string, membershipId: string) {
  return queryOne<MembershipRow>(`${SELECT} WHERE m.gym_id = $1 AND m.id = $2`, [
    gymId,
    membershipId,
  ]);
}

export async function listMemberships(
  gymId: string,
  options: { status?: string; q?: string; page?: number; pageSize?: number; today: string },
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, options.pageSize ?? 10));
  const values: unknown[] = [gymId];
  const conditions = ["m.gym_id = $1"];
  // Bind today only when a status filter needs it; unused parameters are rejected.
  let todayPlaceholder: string | null = null;
  const todayParam = () => {
    if (!todayPlaceholder) {
      values.push(options.today);
      todayPlaceholder = `$${values.length}`;
    }
    return todayPlaceholder;
  };
  if (options.q) {
    values.push(`%${options.q}%`);
    conditions.push(
      `(p.full_name ILIKE $${values.length} OR p.email ILIKE $${values.length} OR mp.name ILIKE $${values.length})`,
    );
  }
  switch (options.status) {
    case "active":
      conditions.push(`m.status = 'active' AND m.end_date >= ${todayParam()}`);
      break;
    case "expiring": {
      const from = todayParam();
      values.push(addDays(options.today, 7));
      conditions.push(`m.status = 'active' AND m.end_date BETWEEN ${from} AND $${values.length}`);
      break;
    }
    case "expired":
      conditions.push(`m.status IN ('active', 'completed') AND m.end_date < ${todayParam()}`);
      break;
    case "pending":
    case "cancelled":
    case "completed":
      values.push(options.status);
      conditions.push(`m.status = $${values.length}`);
      break;
    default:
      break;
  }
  const where = conditions.join(" AND ");
  const total = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     JOIN gym_members gm ON gm.id = m.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE ${where}`,
    values,
  );
  const rows = await query<MembershipRow>(
    `${SELECT} WHERE ${where} ORDER BY m.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (page - 1) * pageSize],
  );
  const count = total?.total ?? 0;
  return {
    memberships: rows,
    total: count,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export async function getUpcomingExpiries(gymId: string, today: string, days = 30) {
  return query<MembershipRow>(
    `${SELECT} WHERE m.gym_id = $1 AND m.status = 'active'
       AND m.end_date BETWEEN $2 AND $3
     ORDER BY m.end_date ASC`,
    [gymId, today, addDays(today, days)],
  );
}

export async function getMemberMemberships(gymId: string, memberId: string) {
  return query<MembershipRow>(`${SELECT} WHERE m.gym_id = $1 AND m.member_id = $2 ORDER BY m.start_date DESC`, [
    gymId,
    memberId,
  ]);
}

export async function assignMembership(input: {
  gymId: string;
  memberId: string;
  planId: string;
  startDate: string;
  actorId: string;
  today: string;
}) {
  const member = await getMemberById(input.gymId, input.memberId);
  if (!member) throw new Error("Member not found in this gym.");
  const plan = await queryOne<{
    id: string;
    price_cents: number;
    duration_days: number;
    archived_at: string | null;
  }>(
    "SELECT id, price_cents, duration_days, archived_at FROM membership_plans WHERE gym_id = $1 AND id = $2",
    [input.gymId, input.planId],
  );
  if (!plan) throw new Error("Plan not found.");
  if (plan.archived_at) throw new Error("Archived plans cannot be assigned.");

  const endDate = computeEndDate(input.startDate, plan.duration_days);
  const membershipId = randomUUID();

  await transaction(async (tx) => {
    const existingResult = await tx.query<Membership>(
      `SELECT * FROM memberships WHERE member_id = $1 AND status IN ('active', 'pending') FOR UPDATE`,
      [input.memberId],
    );
    const existing = existingResult.rows;
    const active = existing.find((row) => row.status === "active");
    const pending = existing.find((row) => row.status === "pending");
    if (pending) {
      throw new Error("This member already has a scheduled membership. Resolve it first.");
    }
    if (active && input.startDate <= active.end_date) {
      throw new Error(
        `The current membership runs until ${active.end_date}. Choose a start date after that.`,
      );
    }
    // Keep the current plan active until its real end date. A future renewal is
    // stored alongside it as pending and promoted automatically by the status
    // sync when the current plan ends.
    const startsNow = input.startDate <= input.today;
    await tx.query(
      `INSERT INTO memberships
        (id, gym_id, member_id, plan_id, start_date, end_date, status, price_cents, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        membershipId,
        input.gymId,
        input.memberId,
        input.planId,
        input.startDate,
        endDate,
        startsNow ? "active" : "pending",
        plan.price_cents,
        input.actorId,
      ],
    );
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "membership.assigned",
    entityType: "membership",
    entityId: membershipId,
    metadata: {
      memberId: input.memberId,
      planId: input.planId,
      startDate: input.startDate,
      endDate,
    },
  });
  return { id: membershipId, endDate };
}

export async function cancelMembership(input: {
  gymId: string;
  membershipId: string;
  actorId: string;
}) {
  const membership = await queryOne<Membership>(
    "SELECT * FROM memberships WHERE gym_id = $1 AND id = $2",
    [input.gymId, input.membershipId],
  );
  if (!membership) throw new Error("Membership not found.");
  if (!["active", "pending"].includes(membership.status)) {
    throw new Error("Only active or scheduled memberships can be cancelled.");
  }
  await query(
    "UPDATE memberships SET status = 'cancelled', updated_at = now() WHERE id = $1 AND gym_id = $2",
    [input.membershipId, input.gymId],
  );
  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "membership.cancelled",
    entityType: "membership",
    entityId: input.membershipId,
  });
}

export async function createRenewalRequest(input: {
  gymId: string;
  memberId: string;
  note?: string | null;
}) {
  const pending = await queryOne<{ id: string }>(
    "SELECT id FROM renewal_requests WHERE member_id = $1 AND status = 'pending' LIMIT 1",
    [input.memberId],
  );
  if (pending) throw new Error("You already have a pending renewal request.");
  const current = await getCurrentMembership(input.gymId, input.memberId);
  await query(
    `INSERT INTO renewal_requests (id, gym_id, member_id, membership_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), input.gymId, input.memberId, current?.id ?? null, input.note || null],
  );
}

export async function getRenewalRequestForMember(memberId: string) {
  return queryOne<RenewalRequest>(
    `SELECT rr.*, p.full_name AS member_name, p.email AS member_email
     FROM renewal_requests rr
     JOIN gym_members gm ON gm.id = rr.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE rr.member_id = $1 ORDER BY rr.created_at DESC LIMIT 1`,
    [memberId],
  );
}

export async function listRenewalRequests(gymId: string) {
  return query<RenewalRequest>(
    `SELECT rr.*, p.full_name AS member_name, p.email AS member_email
     FROM renewal_requests rr
     JOIN gym_members gm ON gm.id = rr.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE rr.gym_id = $1
     ORDER BY CASE rr.status WHEN 'pending' THEN 0 ELSE 1 END, rr.created_at DESC LIMIT 30`,
    [gymId],
  );
}

export async function handleRenewalRequest(input: {
  gymId: string;
  requestId: string;
  status: "handled" | "declined";
  actorId: string;
}) {
  await query(
    `UPDATE renewal_requests SET status = $1, handled_at = now(), handled_by = $2
     WHERE id = $3 AND gym_id = $4`,
    [input.status, input.actorId, input.requestId, input.gymId],
  );
  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: `renewal_request.${input.status}`,
    entityType: "renewal_request",
    entityId: input.requestId,
  });
}

export function derivedStatus(membership: MembershipRow | null, today: string) {
  return effectiveMembershipStatus(
    membership
      ? {
          status: membership.status,
          startDate: membership.start_date,
          endDate: membership.end_date,
        }
      : null,
    today,
  );
}
