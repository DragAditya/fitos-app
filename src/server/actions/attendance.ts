"use server";

import { revalidatePath } from "next/cache";
import { manualCheckInSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requireMember, requireOwner } from "@/server/auth/session";
import { recordAttendance, selfCheckInWithGymQr } from "@/server/services/attendance";
import { rateLimit } from "@/server/rate-limit";
import { failure, validationFailure } from "./helpers";

export type ManualCheckInResult =
  | { status: "success"; message: string; memberName: string; time: string }
  | { status: "rejected"; message: string; memberName?: string };

export type SelfCheckInResult =
  | { status: "success"; message: string; memberName: string; gymName: string; time: string }
  | { status: "rejected"; message: string; code?: string };

export async function manualCheckInAction(input: {
  memberId: string;
}): Promise<ActionResult<ManualCheckInResult>> {
  const auth = await requireOwner();
  const parsed = manualCheckInSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const result = await recordAttendance({
      gymId: auth.gym.id,
      memberId: parsed.data.memberId,
      actorId: auth.profile.id,
      method: "manual",
      timezone: auth.gym.timezone,
    });
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    revalidatePath(`/members/${parsed.data.memberId}`);
    revalidatePath("/me/attendance");

    if (!result.ok) {
      return {
        ok: true,
        message: "Check-in rejected.",
        data: {
          status: "rejected",
          message: result.message,
          memberName: result.member?.full_name,
        },
      };
    }

    return {
      ok: true,
      message: "Check-in recorded.",
      data: {
        status: "success",
        memberName: result.member.full_name,
        message: "Check-in recorded.",
        time: new Date(result.attendance.checked_in_at).toISOString(),
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function selfCheckInAction(
  token: string,
): Promise<ActionResult<SelfCheckInResult>> {
  const auth = await requireMember();
  if (auth.gym.member_checkin_enabled === false) {
    return {
      ok: false,
      error: "Self check-in is paused by the gym. Ask the front desk to check you in.",
    };
  }
  if (!token || token.length < 10) {
    return { ok: false, error: "This check-in code is not valid." };
  }

  const limit = rateLimit(`self-checkin:${auth.member.id}`, 8, 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many check-in attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  try {
    const result = await selfCheckInWithGymQr({
      gymId: auth.gym.id,
      memberId: auth.member.id,
      actorId: auth.profile.id,
      token,
      timezone: auth.gym.timezone,
    });

    if (!result.ok) {
      return {
        ok: true,
        message: "Check-in rejected.",
        data: {
          status: "rejected",
          message: result.message,
          code: result.code,
        },
      };
    }

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    revalidatePath("/me");
    revalidatePath("/me/attendance");
    revalidatePath(`/members/${auth.member.id}`);

    return {
      ok: true,
      message: "Checked in.",
      data: {
        status: "success",
        memberName: result.member.full_name,
        gymName: auth.gym.name,
        message: "You're checked in.",
        time: new Date(result.attendance.checked_in_at).toISOString(),
      },
    };
  } catch (error) {
    return failure(error);
  }
}
