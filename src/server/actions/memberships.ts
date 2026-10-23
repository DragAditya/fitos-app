"use server";

import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/dates";
import { assignMembershipSchema, type AssignMembershipInput } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requireMember, requireOwner } from "@/server/auth/session";
import {
  assignMembership,
  cancelMembership,
  createRenewalRequest,
  handleRenewalRequest,
} from "@/server/services/memberships";
import { writeAudit } from "@/server/audit";
import { failure, validationFailure } from "./helpers";

export async function assignMembershipAction(
  input: AssignMembershipInput,
): Promise<ActionResult<{ membershipId: string; endDate: string }>> {
  const auth = await requireOwner();
  const parsed = assignMembershipSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await assignMembership({
      gymId: auth.gym.id,
      memberId: parsed.data.memberId,
      planId: parsed.data.planId,
      startDate: parsed.data.startDate,
      actorId: auth.profile.id,
      today: todayISO(auth.gym.timezone),
    });
    revalidatePath("/plans");
    revalidatePath("/members");
    revalidatePath(`/members/${parsed.data.memberId}`);
    revalidatePath("/dashboard");
    revalidatePath("/me/membership");
    return {
      ok: true,
      message: `Membership assigned. It runs until ${result.endDate}.`,
      data: { membershipId: result.id, endDate: result.endDate },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelMembershipAction(
  membershipId: string,
  memberId: string,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  try {
    await cancelMembership({
      gymId: auth.gym.id,
      membershipId,
      actorId: auth.profile.id,
    });
    revalidatePath("/plans");
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Membership cancelled.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function handleRenewalRequestAction(
  requestId: string,
  status: "handled" | "declined",
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  try {
    await handleRenewalRequest({
      gymId: auth.gym.id,
      requestId,
      status,
      actorId: auth.profile.id,
    });
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: status === "handled" ? "Renewal request marked handled." : "Renewal request declined.",
      data: undefined,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function requestRenewalAction(note?: string): Promise<ActionResult<undefined>> {
  const auth = await requireMember();
  try {
    await createRenewalRequest({
      gymId: auth.gym.id,
      memberId: auth.member.id,
      note: note?.trim() || null,
    });
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "renewal_request.created",
      entityType: "renewal_request",
      entityId: auth.member.id,
    });
    revalidatePath("/me/membership");
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: "Renewal request sent. The gym will follow up with you.",
      data: undefined,
    };
  } catch (error) {
    return failure(error);
  }
}
