import "server-only";

import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "@/server/db/client";
import type { MembershipPlan } from "@/server/db/types";
import type { PlanInput } from "@/lib/validation";

function benefitsLiteral(benefits: string[]) {
  return `{${benefits.map((item) => `"${item.replaceAll('"', '\\"')}"`).join(",")}}`;
}

function normalize(input: PlanInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    priceCents: Math.round(input.price * 100),
    durationDays: input.durationDays,
    durationLabel: input.durationLabel.trim(),
    benefits: (input.benefitsText ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

export async function listPlans(gymId: string) {
  return query<MembershipPlan>(
    `SELECT mp.*,
       (SELECT COUNT(*)::int FROM memberships m
        WHERE m.plan_id = mp.id AND m.status = 'active'
          AND m.end_date >= (now() AT TIME ZONE g.timezone)::date) AS active_members
     FROM membership_plans mp
     JOIN gyms g ON g.id = mp.gym_id
     WHERE mp.gym_id = $1
     ORDER BY mp.archived_at NULLS FIRST, mp.price_cents ASC`,
    [gymId],
  );
}

export async function getActivePlans(gymId: string) {
  return query<MembershipPlan>(
    `SELECT * FROM membership_plans
     WHERE gym_id = $1 AND archived_at IS NULL
     ORDER BY price_cents ASC`,
    [gymId],
  );
}

export async function getPlan(gymId: string, planId: string) {
  return queryOne<MembershipPlan>(
    "SELECT * FROM membership_plans WHERE gym_id = $1 AND id = $2",
    [gymId, planId],
  );
}

export async function createPlan(gymId: string, input: PlanInput) {
  const plan = normalize(input);
  const id = randomUUID();
  await execute(
    `INSERT INTO membership_plans
      (id, gym_id, name, description, price_cents, duration_days, duration_label, benefits)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[])`,
    [
      id,
      gymId,
      plan.name,
      plan.description,
      plan.priceCents,
      plan.durationDays,
      plan.durationLabel,
      benefitsLiteral(plan.benefits),
    ],
  );
  return id;
}

export async function updatePlan(gymId: string, planId: string, input: PlanInput) {
  const existing = await getPlan(gymId, planId);
  if (!existing) throw new Error("Plan not found.");
  const plan = normalize(input);
  await execute(
    `UPDATE membership_plans SET name = $1, description = $2, price_cents = $3,
       duration_days = $4, duration_label = $5, benefits = $6::text[], updated_at = now()
     WHERE id = $7 AND gym_id = $8`,
    [
      plan.name,
      plan.description,
      plan.priceCents,
      plan.durationDays,
      plan.durationLabel,
      benefitsLiteral(plan.benefits),
      planId,
      gymId,
    ],
  );
}

export async function setPlanArchived(gymId: string, planId: string, archived: boolean) {
  const existing = await getPlan(gymId, planId);
  if (!existing) throw new Error("Plan not found.");
  await execute(
    "UPDATE membership_plans SET archived_at = $1, updated_at = now() WHERE id = $2 AND gym_id = $3",
    [archived ? new Date() : null, planId, gymId],
  );
}
