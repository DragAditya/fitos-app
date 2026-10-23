"use server";

import { revalidatePath } from "next/cache";
import {
  changePasswordSchema,
  gymSettingsSchema,
  ownerProfileSchema,
  profileSchema,
  type ChangePasswordInput,
  type GymSettingsInput,
  type OwnerProfileInput,
  type ProfileInput,
} from "@/lib/validation";
import type { ActionResult } from "@/types";
import { destroyOtherSessions, requireMember, requireOwner } from "@/server/auth/session";
import { changePassword, updateOwnerProfile, updateGymSettings } from "@/server/services/accounts";
import { updateProfile } from "@/server/services/accounts";
import { writeAudit } from "@/server/audit";
import { failure, validationFailure } from "./helpers";

export async function updateGymSettingsAction(
  input: GymSettingsInput,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  const parsed = gymSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateGymSettings(auth.gym.id, auth.profile.id, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    revalidatePath("/me");
    return { ok: true, message: "Workspace settings saved.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function updateOwnerProfileAction(
  input: OwnerProfileInput,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  const parsed = ownerProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateOwnerProfile(auth.gym.id, auth.profile.id, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, message: "Owner profile updated.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function changeOwnerPasswordAction(
  input: ChangePasswordInput,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await changePassword(auth.profile.id, parsed.data);
    return { ok: true, message: "Password changed.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function signOutOtherSessionsAction(): Promise<ActionResult<{ revoked: number }>> {
  const auth = await requireOwner();
  try {
    const revoked = await destroyOtherSessions(auth.profile.id);
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "auth.other_sessions_revoked",
      entityType: "profile",
      entityId: auth.profile.id,
      metadata: { revoked },
    });
    revalidatePath("/settings");
    return {
      ok: true,
      message:
        revoked > 0
          ? `${revoked} other session${revoked === 1 ? "" : "s"} signed out.`
          : "No other sessions are currently signed in.",
      data: { revoked },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMyProfileAction(
  input: ProfileInput,
): Promise<ActionResult<undefined>> {
  const auth = await requireMember();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateProfile(auth.profile.id, parsed.data);
    revalidatePath("/me/profile");
    revalidatePath("/me");
    return { ok: true, message: "Profile updated.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function changeMyPasswordAction(
  input: ChangePasswordInput,
): Promise<ActionResult<undefined>> {
  const auth = await requireMember();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await changePassword(auth.profile.id, parsed.data);
    return { ok: true, message: "Password changed.", data: undefined };
  } catch (error) {
    return failure(error);
  }
}
