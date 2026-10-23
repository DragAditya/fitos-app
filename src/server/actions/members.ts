"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { memberCreateSchema, memberUpdateSchema } from "@/lib/validation";
import type { MemberCreateInput, MemberUpdateInput } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requireOwner } from "@/server/auth/session";
import { createMemberRecord, getMemberById, setMemberStatus, updateMemberRecord } from "@/server/services/members";
import { createMemberInvite } from "@/server/services/accounts";
import { writeAudit } from "@/server/audit";
import { getAppUrl } from "@/server/env";
import { failure, validationFailure } from "./helpers";

export async function createMemberAction(
  input: MemberCreateInput,
): Promise<ActionResult<{ memberId: string; inviteUrl: string }>> {
  const auth = await requireOwner();
  const parsed = memberCreateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const rawToken = randomBytes(24).toString("base64url");
    const expires = new Date(Date.now() + 7 * 86_400_000);
    const member = await createMemberRecord({
      gymId: auth.gym.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      joinedAt: parsed.data.joinedAt,
      emergencyContact: parsed.data.emergencyContact,
      notes: parsed.data.notes,
      inviteTokenHash: createHash("sha256").update(rawToken).digest("hex"),
      inviteExpiresAt: expires,
    });
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "member.created",
      entityType: "member",
      entityId: member.id,
    });
    revalidatePath("/members");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: `${parsed.data.fullName} was added. Share the invite link so they can activate their account.`,
      data: {
        memberId: member.id,
        inviteUrl: `${getAppUrl()}/join/${rawToken}`,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMemberAction(
  memberId: string,
  input: MemberUpdateInput,
): Promise<ActionResult<{ memberId: string }>> {
  const auth = await requireOwner();
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateMemberRecord({
      gymId: auth.gym.id,
      memberId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address,
      status: parsed.data.status,
      emergencyContact: parsed.data.emergencyContact,
      notes: parsed.data.notes,
    });
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "member.updated",
      entityType: "member",
      entityId: memberId,
    });
    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Member details updated.", data: { memberId } };
  } catch (error) {
    return failure(error);
  }
}

export async function setMemberStatusAction(
  memberId: string,
  status: "active" | "inactive" | "suspended",
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  try {
    await setMemberStatus({ gymId: auth.gym.id, memberId, status });
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: `member.status_${status}`,
      entityType: "member",
      entityId: memberId,
    });
    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/dashboard");
    return { ok: true, message: `Member marked ${status}.`, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function resendMemberInviteAction(
  memberId: string,
): Promise<ActionResult<{ inviteUrl: string }>> {
  const auth = await requireOwner();
  try {
    const member = await getMemberById(auth.gym.id, memberId);
    if (!member) throw new Error("Member not found.");
    if (member.has_password) throw new Error("This member has already activated their account.");
    const invite = await createMemberInvite({
      gymId: auth.gym.id,
      memberId,
      actorId: auth.profile.id,
      email: member.email,
    });
    return {
      ok: true,
      message: "A fresh invitation link was created. Previous links no longer work.",
      data: { inviteUrl: `${getAppUrl()}${invite.path}` },
    };
  } catch (error) {
    return failure(error);
  }
}
