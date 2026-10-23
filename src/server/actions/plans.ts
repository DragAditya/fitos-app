"use server";

import { revalidatePath } from "next/cache";
import { planSchema, type PlanInput } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requireOwner } from "@/server/auth/session";
import { createPlan, setPlanArchived, updatePlan } from "@/server/services/plans";
import { writeAudit } from "@/server/audit";
import { failure, validationFailure } from "./helpers";

export async function createPlanAction(
  input: PlanInput,
): Promise<ActionResult<{ planId: string }>> {
  const auth = await requireOwner();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const planId = await createPlan(auth.gym.id, parsed.data);
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "plan.created",
      entityType: "membership_plan",
      entityId: planId,
    });
    revalidatePath("/plans");
    revalidatePath("/members");
    return { ok: true, message: "Membership plan created.", data: { planId } };
  } catch (error) {
    return failure(error);
  }
}

export async function updatePlanAction(
  planId: string,
  input: PlanInput,
): Promise<ActionResult<{ planId: string }>> {
  const auth = await requireOwner();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updatePlan(auth.gym.id, planId, parsed.data);
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: "plan.updated",
      entityType: "membership_plan",
      entityId: planId,
    });
    revalidatePath("/plans");
    return { ok: true, message: "Plan updated.", data: { planId } };
  } catch (error) {
    return failure(error);
  }
}

export async function setPlanArchivedAction(
  planId: string,
  archived: boolean,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  try {
    await setPlanArchived(auth.gym.id, planId, archived);
    await writeAudit({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      action: archived ? "plan.archived" : "plan.restored",
      entityType: "membership_plan",
      entityId: planId,
    });
    revalidatePath("/plans");
    revalidatePath("/members");
    return {
      ok: true,
      message: archived ? "Plan archived. Existing memberships are unaffected." : "Plan restored.",
      data: undefined,
    };
  } catch (error) {
    return failure(error);
  }
}
