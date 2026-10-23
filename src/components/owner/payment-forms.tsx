"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, Loader2, ReceiptText, Sparkles, Wallet } from "lucide-react";
import { paymentSchema, type PaymentInput } from "@/lib/validation";
import type { PaymentQuote, PaymentRow } from "@/server/db/types";
import { getPaymentQuoteAction, recordPaymentAction, updatePaymentStatusAction } from "@/server/actions/payments";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { useActionRunner } from "@/components/forms/use-action-runner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";

type Option = {
  id: string;
  full_name: string;
  member_code: string;
};

type MembershipOption = {
  id: string;
  member_id: string;
  plan_name: string;
  price_cents?: number;
  paid_cents?: number;
  due_cents?: number;
  start_date: string;
  end_date: string;
};

export function RecordPaymentDialog({
  members,
  memberships,
  today,
  defaultMemberId,
  size = "md",
  label = "Record payment",
}: {
  members: Option[];
  memberships: MembershipOption[];
  today: string;
  defaultMemberId?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string>();
  const [receipt, setReceipt] = React.useState<{ receipt: string; id: string } | null>(null);
  const { run, pending } = useActionRunner();
  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      memberId: defaultMemberId ?? "",
      membershipId: "",
      amount: 0,
      method: "upi",
      status: "paid",
      reference: "",
      notes: "",
      paidAt: today,
    },
  });
  const selectedMember = form.watch("memberId");
  const selectedMembership = form.watch("membershipId");
  const amount = form.watch("amount");
  const paymentStatus = form.watch("status");
  const availableMemberships = memberships.filter((item) => item.member_id === selectedMember);
  const [quote, setQuote] = React.useState<PaymentQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [quoteError, setQuoteError] = React.useState<string>();

  React.useEffect(() => {
    if (!selectedMember || !selectedMembership) {
      setQuote(null);
      setQuoteError(undefined);
      setQuoteLoading(false);
      // Never carry a previous member's amount into an unlinked payment.
      form.setValue("amount", 0, { shouldDirty: false });
      return;
    }
    let active = true;
    setQuoteLoading(true);
    setQuoteError(undefined);
    getPaymentQuoteAction(selectedMember, selectedMembership)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setQuote(null);
          setQuoteError(result.error);
          return;
        }
        setQuote(result.data);
        // Always align the field with the fresh quote, including zero, so
        // switching members can never silently record someone else's amount.
        form.setValue("amount", result.data.cashNeededCents / 100, { shouldDirty: false });
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => {
      active = false;
    };
    // The quote is intentionally refreshed only when the member or membership changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, selectedMembership]);

  React.useEffect(() => {
    if (!selectedMember) {
      if (form.getValues("membershipId")) form.setValue("membershipId", "");
      return;
    }
    const current = form.getValues("membershipId");
    if (current && memberships.some((item) => item.id === current && item.member_id === selectedMember)) {
      return;
    }
    const first = memberships.find((item) => item.member_id === selectedMember);
    form.setValue("membershipId", first?.id ?? "");
    // Keep the linked plan aligned with the selected member.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, memberships]);

  async function onSubmit(values: PaymentInput) {
    setServerError(undefined);
    const result = await run(() => recordPaymentAction(values), {
      onSuccess: (data) => setReceipt({ receipt: data.receipt, id: data.paymentId }),
    });
    if (result && !result.ok) {
      setServerError(result.error);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) form.setError(field as keyof PaymentInput, { message: messages[0] });
      });
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReceipt(null);
      setServerError(undefined);
      setQuote(null);
      setQuoteError(undefined);
      form.reset({
        memberId: defaultMemberId ?? "", membershipId: "", amount: 0, method: "upi",
        status: "paid", reference: "", notes: "", paidAt: today,
      });
    }
  }

  const enteredCents = Math.max(0, Math.round((Number(amount) || 0) * 100));
  const cashNeededCents = quote?.cashNeededCents ?? 0;
  const previewPlanCents = quote ? Math.min(enteredCents, cashNeededCents) : 0;
  const previewAdvanceCents = quote ? Math.max(0, enteredCents - cashNeededCents) : enteredCents;
  const currency = quote?.currency ?? "INR";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant={size === "sm" ? "secondary" : "gradient"} size={size === "sm" ? "sm" : "md"} onClick={() => setOpen(true)}>
        <Wallet /> {label}
      </Button>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{receipt ? "Payment recorded" : "Record a payment"}</DialogTitle>
          <DialogDescription>
            {receipt
              ? "The payment is stored immediately and appears in the member’s billing history."
              : "Plan and advance are split automatically. Nothing beyond the plan balance is applied to the plan."}
          </DialogDescription>
        </DialogHeader>
        {receipt ? (
          <DialogBody>
            <div className="rounded-[16px] border border-[#cfeade] bg-[#f2fbf6] p-4">
              <CheckCircle2 className="size-5 text-positive" />
              <p className="mt-2 text-[13px] font-semibold text-[#196a4e]">Receipt {receipt.receipt}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#3d7561]">
                Recorded against the member’s account. Open the receipt to print or share it.
              </p>
            </div>
            <p className="mt-4 rounded-[12px] border border-line bg-[#fbfbf8] p-3 text-[10.5px] leading-relaxed text-muted">
              Source: front-desk entry. Gateway verified: no. Status changes are audit-logged.
            </p>
          </DialogBody>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogBody className="space-y-3.5">
              {serverError ? <Alert variant="danger">{serverError}</Alert> : null}
              <Field label="Member" htmlFor="pay-member" error={form.formState.errors.memberId?.message}>
                <NativeSelect
                  id="pay-member"
                  {...form.register("memberId", {
                    onChange: () => form.setValue("membershipId", ""),
                  })}
                >
                  <option value="">Choose a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name} · {member.member_code}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Link to membership" htmlFor="pay-membership" hint="Optional">
                <NativeSelect id="pay-membership" {...form.register("membershipId")} disabled={!selectedMember}>
                  <option value="">No membership link</option>
                  {availableMemberships.map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.plan_name} · {membership.start_date} to {membership.end_date}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Amount received (₹)" htmlFor="pay-amount" error={form.formState.errors.amount?.message}>
                  <Input id="pay-amount" type="number" min="1" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
                </Field>
                <Field label="Paid on" htmlFor="pay-date" error={form.formState.errors.paidAt?.message}>
                  <Input id="pay-date" type="date" {...form.register("paidAt")} />
                </Field>
              </div>
              {quoteLoading ? (
                <div className="flex items-center gap-2 rounded-[12px] border border-line bg-[#fbfbf8] px-3 py-2.5 text-[11px] text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Checking plan balance and advance credit…
                </div>
              ) : quote ? (
                <div className="overflow-hidden rounded-[14px] border border-[#dfe0fb] bg-[linear-gradient(135deg,#f7f7ff_0%,#fbf9ff_100%)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[#e8e8fb] px-3.5 py-2.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5a58b8]">
                      <Sparkles className="size-3" /> Plan balance preview
                    </span>
                    <span className="text-[10px] text-[#7776a8]">{quote.planName}</span>
                  </div>
                  <div className="space-y-2 px-3.5 py-3 text-[11px]">
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>Plan value</span>
                      <span className="font-medium text-ink">{formatMoney(quote.priceCents, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>Already applied</span>
                      <span className="font-medium text-ink">− {formatMoney(quote.paidCents, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>Advance credit available</span>
                      <span className="font-medium text-positive">{formatMoney(quote.advanceCents, currency)}</span>
                    </div>
                    {quote.creditToApplyCents > 0 ? (
                      <div className="flex items-center justify-between gap-3 text-muted">
                        <span>Advance used on this payment</span>
                        <span className="font-medium text-ink">− {formatMoney(quote.creditToApplyCents, currency)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 border-t border-[#e8e8fb] pt-2 text-[12px]">
                      <span className="font-medium text-ink">Cash needed to settle</span>
                      <span className="font-semibold text-ink">{formatMoney(cashNeededCents, currency)}</span>
                    </div>
                    {enteredCents > 0 ? (
                      <div className="mt-1 grid grid-cols-2 gap-2 rounded-[10px] bg-white/70 p-2">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.1em] text-soft">To plan</p>
                          <p className="mt-0.5 font-semibold text-ink">{formatMoney(previewPlanCents, currency)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.1em] text-soft">To advance</p>
                          <p className={previewAdvanceCents > 0 ? "mt-0.5 font-semibold text-positive" : "mt-0.5 font-semibold text-ink"}>
                            {formatMoney(previewAdvanceCents, currency)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {previewAdvanceCents > 0 ? (
                      <p className="text-[10px] leading-relaxed text-[#5e5d93]">
                        The extra {formatMoney(previewAdvanceCents, currency)} is not applied to this plan. It is
                        held as advance credit and used on the next payment.
                      </p>
                    ) : null}
                    {paymentStatus !== "paid" ? (
                      <p className="text-[10px] leading-relaxed text-[#80570f]">
                        Advance is applied only when this payment is marked paid.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : quoteError ? (
                <Alert variant="danger">{quoteError}</Alert>
              ) : selectedMember && !selectedMembership ? (
                <p className="rounded-[12px] border border-[#ece4d4] bg-[#fffaf0] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#80570f]">
                  No plan linked. The full amount will be held as advance credit for this member.
                </p>
              ) : null}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Method" htmlFor="pay-method" error={form.formState.errors.method?.message}>
                  <NativeSelect id="pay-method" {...form.register("method")}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </NativeSelect>
                </Field>
                <Field label="Status" htmlFor="pay-status" error={form.formState.errors.status?.message}>
                  <NativeSelect id="pay-status" {...form.register("status")}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Reference" htmlFor="pay-reference" hint="UPI ID, receipt no." error={form.formState.errors.reference?.message}>
                <Input id="pay-reference" placeholder="e.g. UPI ref 4839" {...form.register("reference")} />
              </Field>
              <Field label="Notes" htmlFor="pay-notes" hint="Optional" error={form.formState.errors.notes?.message}>
                <Textarea id="pay-notes" className="min-h-[64px]" {...form.register("notes")} />
              </Field>
              <p className="rounded-[11px] border border-[#ece4d4] bg-[#fffaf0] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#80570f]">
                Manually recorded. Verify the amount against the member’s plan before saving.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null} Record payment
              </Button>
            </DialogFooter>
          </form>
        )}
        {receipt ? (
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>Done</Button>
            <Button asChild variant="primary">
              <Link href={`/receipts/${receipt.id}`}><ReceiptText /> Open receipt</Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function PaymentStatusActions({ payment }: { payment: PaymentRow }) {
  const { run, pending } = useActionRunner();
  const [refundOpen, setRefundOpen] = React.useState(false);
  const transitions: Array<{ status: "paid" | "pending" | "failed" | "refunded"; label: string }> =
    payment.status === "paid"
      ? [{ status: "refunded", label: "Refund payment" }, { status: "failed", label: "Mark failed" }]
      : payment.status === "pending"
        ? [{ status: "paid", label: "Mark paid" }, { status: "failed", label: "Mark failed" }]
        : payment.status === "failed"
          ? [{ status: "paid", label: "Mark paid" }, { status: "pending", label: "Mark pending" }]
          : [];

  if (!transitions.length) {
    return <span className="text-[11px] text-soft">Final</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null} Update <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Payment status</DropdownMenuLabel>
          {transitions.map((transition) =>
            transition.status === "refunded" ? (
              <DropdownMenuItem key={transition.status} onSelect={() => setRefundOpen(true)}>
                {transition.label}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={transition.status}
                onSelect={() => run(() => updatePaymentStatusAction(payment.id, transition.status))}
              >
                {transition.label}
              </DropdownMenuItem>
            ),
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/receipts/${payment.id}`}><ReceiptText /> View receipt</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Refund this payment?"
        description={`${formatMoney(payment.amount_cents)} will be excluded from collected revenue. The record and audit trail remain.`}
        confirmLabel="Refund payment"
        destructive
        onConfirm={() => run(() => updatePaymentStatusAction(payment.id, "refunded"))}
      />
    </>
  );
}
