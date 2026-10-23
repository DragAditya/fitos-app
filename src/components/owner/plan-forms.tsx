"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, CalendarPlus, Check, Loader2, Pencil, Plus, RotateCcw } from "lucide-react";
import { assignMembershipSchema, planSchema, type AssignMembershipInput, type PlanInput } from "@/lib/validation";
import type { MembershipPlan, RenewalRequest } from "@/server/db/types";
import { createPlanAction, setPlanArchivedAction, updatePlanAction } from "@/server/actions/plans";
import { assignMembershipAction, handleRenewalRequestAction } from "@/server/actions/memberships";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { useActionRunner } from "@/components/forms/use-action-runner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function PlanDialog({ plan, trigger }: { plan?: MembershipPlan; trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string>();
  const { run, pending } = useActionRunner();
  const form = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          description: plan.description ?? "",
          price: plan.price_cents / 100,
          durationDays: plan.duration_days,
          durationLabel: plan.duration_label,
          benefitsText: plan.benefits.join("\n"),
        }
      : { name: "", description: "", price: 2500, durationDays: 30, durationLabel: "1 month", benefitsText: "" },
  });

  async function onSubmit(values: PlanInput) {
    setServerError(undefined);
    const result = await run(
      () => (plan ? updatePlanAction(plan.id, values) : createPlanAction(values)),
      { onSuccess: () => { setOpen(false); form.reset(); router.refresh(); } },
    );
    if (result && !result.ok) setServerError(result.error);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setServerError(undefined);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="gradient" onClick={() => setOpen(true)}>
          <Plus /> New plan
        </Button>
      )}
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "Create a membership plan"}</DialogTitle>
          <DialogDescription>
            Plan terms are snapshotted onto each membership when assigned, so later edits never rewrite history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-3.5">
            {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
            <div className="grid gap-3.5 sm:grid-cols-[1.5fr_0.8fr]">
              <Field label="Plan name" htmlFor="plan-name" error={form.formState.errors.name?.message}>
                <Input id="plan-name" placeholder="e.g. Quarterly" {...form.register("name")} />
              </Field>
              <Field label="Duration label" htmlFor="plan-label" error={form.formState.errors.durationLabel?.message}>
                <Input id="plan-label" placeholder="3 months" {...form.register("durationLabel")} />
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Price (₹)" htmlFor="plan-price" error={form.formState.errors.price?.message}>
                <Input id="plan-price" type="number" min="0" step="1" {...form.register("price", { valueAsNumber: true })} />
              </Field>
              <Field label="Duration (days)" htmlFor="plan-days" error={form.formState.errors.durationDays?.message}>
                <Input id="plan-days" type="number" min="1" step="1" {...form.register("durationDays", { valueAsNumber: true })} />
              </Field>
            </div>
            <Field label="Description" htmlFor="plan-description" hint="Optional" error={form.formState.errors.description?.message}>
              <Input id="plan-description" placeholder="A concise line for the front desk." {...form.register("description")} />
            </Field>
            <Field label="Benefits" htmlFor="plan-benefits" hint="One per line" error={form.formState.errors.benefitsText?.message}>
              <Textarea id="plan-benefits" placeholder={"Full gym floor access\nGroup classes\nRecovery room"} {...form.register("benefitsText")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} {plan ? "Save plan" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlanArchiveButton({ plan }: { plan: MembershipPlan }) {
  const { run, pending } = useActionRunner();
  const archived = Boolean(plan.archived_at);
  if (!archived) {
    return (
      <ConfirmDialog
        title={`Archive ${plan.name}?`}
        description="The plan disappears from the assignment picker. Existing memberships continue unchanged and can still be renewed from history."
        confirmLabel="Archive plan"
        destructive
        onConfirm={() => run(() => setPlanArchivedAction(plan.id, true))}
        trigger={<Button variant="ghost" size="sm" disabled={pending}><Archive /> Archive</Button>}
      />
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => run(() => setPlanArchivedAction(plan.id, false))}
    >
      <RotateCcw /> Restore
    </Button>
  );
}

export function PlanEditTrigger({ plan }: { plan: MembershipPlan }) {
  return (
    <PlanDialog
      plan={plan}
      trigger={
        <Button variant="ghost" size="iconSm" aria-label={`Edit ${plan.name}`}>
          <Pencil />
        </Button>
      }
    />
  );
}

export function AssignMembershipDialog({
  members,
  plans,
  defaultStart,
  memberId,
  label = "Assign membership",
  size = "md",
}: {
  members: Array<{ id: string; full_name: string; member_code: string }>;
  plans: MembershipPlan[];
  defaultStart: string;
  memberId?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string>();
  const { run, pending } = useActionRunner();
  const form = useForm<AssignMembershipInput>({
    resolver: zodResolver(assignMembershipSchema),
    defaultValues: { memberId: memberId ?? "", planId: plans[0]?.id ?? "", startDate: defaultStart },
  });
  const selectedPlanId = form.watch("planId");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  async function onSubmit(values: AssignMembershipInput) {
    setServerError(undefined);
    const result = await run(() => assignMembershipAction(values), {
      onSuccess: () => { setOpen(false); router.refresh(); },
    });
    if (result && !result.ok) setServerError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={size === "sm" ? "secondary" : "gradient"} size={size === "sm" ? "sm" : "md"} onClick={() => setOpen(true)} disabled={!plans.length}>
        <CalendarPlus /> {label}
      </Button>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Assign a membership</DialogTitle>
          <DialogDescription>
            The current plan stays active until its end date. A future plan is queued as a scheduled renewal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-3.5">
            {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
            {!plans.length ? (
              <Alert variant="warning">No active plans yet. Create a plan before assigning a membership.</Alert>
            ) : null}
            {!memberId ? (
              <Field label="Member" htmlFor="assign-member" error={form.formState.errors.memberId?.message}>
                <NativeSelect id="assign-member" {...form.register("memberId")}>
                  <option value="">Choose a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name} · {member.member_code}</option>
                  ))}
                </NativeSelect>
              </Field>
            ) : <input type="hidden" {...form.register("memberId")} />}
            <Field label="Plan" htmlFor="assign-plan" error={form.formState.errors.planId?.message}>
              <NativeSelect id="assign-plan" {...form.register("planId")}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name} · {formatMoney(plan.price_cents)}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Start date" htmlFor="assign-start" error={form.formState.errors.startDate?.message}>
              <Input id="assign-start" type="date" {...form.register("startDate")} />
            </Field>
            {selectedPlan ? (
              <div className="rounded-[13px] border border-line bg-[#fbfbf8] p-3.5">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted">{selectedPlan.duration_label} access</span>
                  <span className="font-semibold">{formatMoney(selectedPlan.price_cents)}</span>
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-soft">
                  Price and duration are copied to the membership. Editing the plan later will not change this record.
                </p>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={pending || !plans.length}>
              {pending ? <Loader2 className="animate-spin" /> : null} Assign membership
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenewalRequestActions({ request }: { request: RenewalRequest }) {
  const { run, pending } = useActionRunner();
  if (request.status !== "pending") return null;
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => run(() => handleRenewalRequestAction(request.id, "handled"))}
      >
        <Check /> Handled
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run(() => handleRenewalRequestAction(request.id, "declined"))}
      >
        Decline
      </Button>
    </div>
  );
}
