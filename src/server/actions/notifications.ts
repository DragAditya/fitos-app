"use server";

import { revalidatePath } from "next/cache";
import { announcementSchema, type AnnouncementInput } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requireMember, requireOwner } from "@/server/auth/session";
import {
  createAnnouncement,
  markAllNotificationsRead,
  markNotificationRead,
  sendExpiryReminders,
  sendPaymentReminders,
} from "@/server/services/notifications";
import { failure, validationFailure } from "./helpers";

export async function createAnnouncementAction(
  input: AnnouncementInput,
): Promise<ActionResult<{ recipients: number }>> {
  const auth = await requireOwner();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await createAnnouncement({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      data: parsed.data,
    });
    revalidatePath("/notifications");
    revalidatePath("/me/notifications");
    return {
      ok: true,
      message: `Notification sent to ${result.recipients} member${result.recipients === 1 ? "" : "s"}.`,
      data: { recipients: result.recipients },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function sendExpiryRemindersAction(): Promise<ActionResult<{ sent: number }>> {
  const auth = await requireOwner();
  try {
    const result = await sendExpiryReminders({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      timezone: auth.gym.timezone,
      reminderDays: auth.gym.reminder_days,
    });
    revalidatePath("/notifications");
    revalidatePath("/me/notifications");
    return {
      ok: true,
      message:
        result.sent > 0
          ? `Expiry reminders sent to ${result.sent} member${result.sent === 1 ? "" : "s"}.`
          : "No new expiry reminders were needed.",
      data: { sent: result.sent },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function sendPaymentRemindersAction(): Promise<ActionResult<{ sent: number }>> {
  const auth = await requireOwner();
  try {
    const result = await sendPaymentReminders({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      timezone: auth.gym.timezone,
    });
    revalidatePath("/notifications");
    revalidatePath("/me/notifications");
    return {
      ok: true,
      message:
        result.sent > 0
          ? `Payment reminders sent to ${result.sent} member${result.sent === 1 ? "" : "s"}.`
          : "No outstanding balances to remind.",
      data: { sent: result.sent },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function markNotificationReadAction(
  recipientId: string,
): Promise<ActionResult<undefined>> {
  const auth = await requireMember();
  try {
    await markNotificationRead({
      gymId: auth.gym.id,
      memberId: auth.member.id,
      recipientId,
    });
    revalidatePath("/me/notifications");
    revalidatePath("/me");
    return { ok: true, message: "Marked as read.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<undefined>> {
  const auth = await requireMember();
  try {
    await markAllNotificationsRead(auth.gym.id, auth.member.id);
    revalidatePath("/me/notifications");
    revalidatePath("/me");
    return { ok: true, message: "All notifications marked as read.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}
