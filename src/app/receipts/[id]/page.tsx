import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuth } from "@/server/auth/session";
import { getPaymentDetails, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/server/services/payments";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { GymLogo } from "@/components/owner/gym-logo";
import { PrintButton } from "@/components/forms/print-button";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth) redirect(`/login?next=/receipts/${id}`);

  const payment = await getPaymentDetails(id);
  if (!payment) notFound();

  const allowed =
    auth.profile.role === "owner"
      ? auth.gym?.id === payment.gym_id
      : auth.member?.id === payment.member_id;
  if (!allowed) notFound();

  const backHref = auth.profile.role === "owner" ? `/payments` : "/me/payments";
  const isOwner = auth.profile.role === "owner";
  const tz = payment.gym_timezone;

  return (
    <div className="min-h-screen bg-[#f6f6f3] px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> {isOwner ? "Back to payments" : "Back to billing"}
          </Link>
          <PrintButton />
        </div>

        <article className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[var(--shadow-soft)] print:rounded-none print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line px-7 py-6">
            <div>
              <div className="flex items-center gap-2">
                <GymLogo
                  name={payment.gym_name}
                  logoUrl={payment.gym_logo_url}
                  className="size-8 rounded-[9px] text-[10px]"
                />
                <span className="text-[16px] font-semibold tracking-[-0.03em]">{payment.gym_name}</span>
              </div>
              <div className="mt-3 space-y-0.5 text-[11px] leading-relaxed text-muted">
                {payment.gym_address ? <p>{payment.gym_address}</p> : null}
                {payment.gym_city ? <p>{payment.gym_city}</p> : null}
                <p>
                  {payment.gym_phone ?? ""}
                  {payment.gym_phone && payment.gym_email ? " · " : ""}
                  {payment.gym_email ?? ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-soft">Receipt</p>
              <p className="mt-1 font-mono text-[13px] font-semibold">{payment.receipt_number}</p>
              <div className="mt-2 flex justify-end">
                <StatusBadge status={payment.status} label={PAYMENT_STATUS_LABELS[payment.status]} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-7 py-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Billed to</p>
              <p className="mt-2 text-[14px] font-semibold tracking-[-0.02em]">{payment.member_name}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{payment.member_email}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">Member code {payment.member_code}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Payment details</p>
              <div className="mt-2 space-y-1 text-[11.5px] text-muted">
                <p>Paid on <span className="font-medium text-ink">{formatDate(payment.paid_at, tz)}</span></p>
                <p>Method <span className="font-medium text-ink">{PAYMENT_METHOD_LABELS[payment.method]}</span></p>
                {payment.reference ? (
                  <p>Reference <span className="font-mono font-medium text-ink">{payment.reference}</span></p>
                ) : null}
                <p>Recorded <span className="font-medium text-ink">{formatDateTime(payment.created_at, tz)}</span></p>
              </div>
            </div>
          </div>

          <div className="px-7">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-line">
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">Description</th>
                  <th className="py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">Period</th>
                  <th className="py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payment.plan_applied_cents > 0 || payment.credit_used_cents > 0 ? (
                  <tr className="border-b border-line">
                    <td className="py-3.5 text-[12.5px]">
                      <span className="font-medium">{payment.plan_name ?? "Membership payment"}</span>
                      {payment.duration_label ? (
                        <span className="block text-[10.5px] text-soft">{payment.duration_label}</span>
                      ) : null}
                      {payment.credit_used_cents > 0 ? (
                        <span className="mt-1 block text-[10.5px] text-[#196a4e]">
                          Includes {formatMoney(payment.credit_used_cents, payment.currency)} advance credit
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 text-[11.5px] text-muted">
                      {payment.membership_start && payment.membership_end
                        ? `${formatDate(payment.membership_start, tz)} → ${formatDate(payment.membership_end, tz)}`
                        : "—"}
                    </td>
                    <td className="py-3.5 text-right text-[12.5px] font-medium tabular">
                      {formatMoney(payment.plan_applied_cents, payment.currency)}
                    </td>
                  </tr>
                ) : null}
                {payment.advance_added_cents > 0 ? (
                  <tr className="border-b border-line">
                    <td className="py-3.5 text-[12.5px]">
                      <span className="font-medium">Advance credit</span>
                      <span className="block text-[10.5px] text-soft">Held for the next membership payment</span>
                    </td>
                    <td className="py-3.5 text-[11.5px] text-muted">—</td>
                    <td className="py-3.5 text-right text-[12.5px] font-medium tabular">
                      {formatMoney(payment.advance_added_cents, payment.currency)}
                    </td>
                  </tr>
                ) : null}
                {payment.plan_applied_cents === 0 && payment.advance_added_cents === 0 && payment.credit_used_cents > 0 ? (
                  <tr className="border-b border-line">
                    <td className="py-3.5 text-[12.5px]">
                      <span className="font-medium">Advance applied to plan</span>
                      <span className="block text-[10.5px] text-soft">No cash collected on this entry</span>
                    </td>
                    <td className="py-3.5 text-[11.5px] text-muted">—</td>
                    <td className="py-3.5 text-right text-[12.5px] font-medium tabular">
                      {formatMoney(payment.credit_used_cents, payment.currency)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end px-7 py-5">
            <div className="w-full max-w-[240px]">
              <div className="flex items-center justify-between border-b border-line py-2 text-[12px]">
                <span className="text-muted">Cash applied to plan</span>
                <span className="font-medium tabular">{formatMoney(payment.plan_applied_cents, payment.currency)}</span>
              </div>
              {payment.credit_used_cents > 0 ? (
                <div className="flex items-center justify-between border-b border-line py-2 text-[12px]">
                  <span className="text-muted">Advance used</span>
                  <span className="font-medium tabular text-positive">{formatMoney(payment.credit_used_cents, payment.currency)}</span>
                </div>
              ) : null}
              {payment.advance_added_cents > 0 ? (
                <div className="flex items-center justify-between border-b border-line py-2 text-[12px]">
                  <span className="text-muted">New advance credit</span>
                  <span className="font-medium tabular text-positive">{formatMoney(payment.advance_added_cents, payment.currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-3 text-[14px] font-semibold">
                <span>Total {payment.status === "refunded" ? "refunded" : "cash received"}</span>
                <span className="tabular">{formatMoney(payment.amount_cents, payment.currency)}</span>
              </div>
            </div>
          </div>

          {payment.notes ? (
            <div className="border-t border-line px-7 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">Notes</p>
              <p className="mt-1.5 whitespace-pre-line text-[11.5px] leading-relaxed text-muted">{payment.notes}</p>
            </div>
          ) : null}

          {payment.gym_receipt_footer ? (
            <div className="border-t border-line px-7 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">From {payment.gym_name}</p>
              <p className="mt-1.5 whitespace-pre-line text-[11.5px] leading-relaxed text-muted">
                {payment.gym_receipt_footer}
              </p>
            </div>
          ) : null}

          <div className="border-t border-line bg-[#fbfbf8] px-7 py-5">
            <p className="text-[10.5px] leading-relaxed text-muted">
              This payment was recorded manually at the {payment.gym_name} front desk. FitOS stores it as a manual
              entry (<span className="font-mono text-[10px]">gateway_verified: false</span>) and does not present it as
              a gateway-verified transaction. {payment.status === "refunded" ? "This payment has been refunded and is excluded from collected revenue." : ""}
            </p>
            <p className="mt-2 text-[10px] text-soft">
              Generated by FitOS · {formatDateTime(new Date(), tz)} · Receipt {payment.receipt_number}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
