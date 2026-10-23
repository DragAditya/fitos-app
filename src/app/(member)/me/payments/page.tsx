import Link from "next/link";
import { ArrowLeft, CircleDollarSign, ReceiptText, TriangleAlert, Wallet } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getMemberPayments, getMemberPaymentSummary, PAYMENT_METHOD_LABELS } from "@/server/services/payments";
import { formatDate, formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Billing" };

export default async function MemberPaymentsPage() {
  const auth = await requireMember();
  const [payments, summary] = await Promise.all([
    getMemberPayments(auth.gym.id, auth.member.id),
    getMemberPaymentSummary(auth.gym.id, auth.member.id),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Billing</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">Payments & receipts</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-positive"><CircleDollarSign className="size-3.5" /></span>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{formatMoney(summary.paid, auth.gym.currency)}</p>
          <p className="mt-1 text-[10.5px] text-muted">cash recorded</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-warning"><TriangleAlert className="size-3.5" /></span>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{formatMoney(summary.outstanding, auth.gym.currency)}</p>
          <p className="mt-1 text-[10.5px] text-muted">plan balance</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#f2fbf6] text-[#196a4e]"><Wallet className="size-3.5" /></span>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{formatMoney(summary.advance, auth.gym.currency)}</p>
          <p className="mt-1 text-[10.5px] text-muted">advance credit</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-[#5551d4]"><ReceiptText className="size-3.5" /></span>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{summary.count}</p>
          <p className="mt-1 text-[10.5px] text-muted">payment record{summary.count === 1 ? "" : "s"}</p>
        </Card>
      </div>

      <Alert variant="info">
        Payments are recorded by the gym front desk. FitOS shows them as manual entries — they are never presented as
        gateway-verified transactions. Ask the front desk about any line you do not recognise.
      </Alert>

      {payments.length ? (
        <div className="space-y-2.5">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fafaf7] text-muted">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold tracking-[-0.015em] tabular">{formatMoney(payment.amount_cents, payment.currency)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {payment.plan_name ?? "No plan link"} · {PAYMENT_METHOD_LABELS[payment.method]}
                    </p>
                    {payment.advance_added_cents > 0 || payment.credit_used_cents > 0 ? (
                      <p className="mt-0.5 text-[10px] text-[#196a4e]">
                        {payment.credit_used_cents > 0 ? `${formatMoney(payment.credit_used_cents, payment.currency)} advance used` : ""}
                        {payment.credit_used_cents > 0 && payment.advance_added_cents > 0 ? " · " : ""}
                        {payment.advance_added_cents > 0 ? `${formatMoney(payment.advance_added_cents, payment.currency)} held as advance` : ""}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[10.5px] text-soft">
                      {formatDate(payment.paid_at, auth.gym.timezone)} · {payment.receipt_number}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                    {payment.notes ? <p className="mt-1.5 text-[10.5px] leading-relaxed text-soft">{payment.notes}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={payment.status} />
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/receipts/${payment.id}`}>Receipt</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ReceiptText />}
          title="No payments yet"
          description="When the gym records a payment for your membership, the receipt appears here."
        />
      )}
    </div>
  );
}
