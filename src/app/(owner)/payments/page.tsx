import Link from "next/link";
import { CircleDollarSign, Download, ReceiptText, RotateCcw, Search, TriangleAlert, Wallet } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { listPayments, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/server/services/payments";
import { getMemberOptions } from "@/server/services/members";
import { getMembershipPaymentOptions } from "@/server/services/payments";
import { todayISO } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader, Pagination, StatCard } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { RecordPaymentDialog, PaymentStatusActions } from "@/components/owner/payment-forms";

export const metadata = { title: "Payments" };

type Params = {
  q?: string;
  status?: string;
  method?: string;
  memberId?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const auth = await requireOwner();
  const params = await searchParams;
  const today = todayISO(auth.gym.timezone);
  const page = Number(params.page) || 1;

  const [result, members, memberships] = await Promise.all([
    listPayments(auth.gym.id, auth.gym.timezone, {
      q: params.q,
      status: params.status,
      method: params.method,
      memberId: params.memberId,
      from: params.from,
      to: params.to,
      page,
    }),
    getMemberOptions(auth.gym.id),
    getMembershipPaymentOptions(auth.gym.id),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const hasFilters = Boolean(params.q || params.status || params.method || params.memberId || params.from || params.to);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Payments"
        description="Every payment here is recorded manually at the front desk. FitOS never labels one as gateway-verified."
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`/api/export/payments${exportQuery ? `?${exportQuery}` : ""}`}><Download /> Export CSV</a>
            </Button>
            <RecordPaymentDialog members={members} memberships={memberships} today={today} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (filtered)" value={formatMoney(result.summary.collected, auth.gym.currency)} icon={<CircleDollarSign />} hint="Status: paid only" />
        <StatCard label="Pending" value={formatMoney(result.summary.pending, auth.gym.currency)} icon={<Wallet />} hint="Awaiting settlement" />
        <StatCard label="Failed" value={formatMoney(result.summary.failed, auth.gym.currency)} icon={<TriangleAlert />} hint="Needs follow-up" />
        <StatCard label="Refunded" value={formatMoney(result.summary.refunded, auth.gym.currency)} icon={<RotateCcw />} hint="Excluded from revenue" />
      </div>

      <Alert variant="warning" icon={<Wallet />} title="Manual entries, clearly labelled">
        Payments recorded here are front-desk entries and are stored with <code className="font-mono text-[10px]">gatewayVerified: false</code> in the audit log. Refunds are excluded from collected revenue but retained in history. Amounts above a plan balance become advance credit automatically.
      </Alert>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-[14px] border border-line bg-white px-4 py-3 text-[10.5px] text-muted">
        <span className="font-medium text-ink">Filtered split</span>
        <span>Plan applied <span className="font-medium text-ink">{formatMoney(result.summary.planApplied, auth.gym.currency)}</span></span>
        <span>Advance added <span className="font-medium text-positive">{formatMoney(result.summary.advanceAdded, auth.gym.currency)}</span></span>
        <span>Advance used <span className="font-medium text-ink">{formatMoney(result.summary.creditUsed, auth.gym.currency)}</span></span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="items-center">
          <div>
            <CardTitle>Payment records</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">{result.total} record{result.total === 1 ? "" : "s"}{hasFilters ? " matching filters" : ""}</p>
          </div>
          {hasFilters ? <Link href="/payments" className="text-[11px] font-medium text-[#5652c8] hover:underline">Clear filters</Link> : null}
        </CardHeader>
        <CardContent className="pt-4">
          <form action="/payments" method="get" className="grid gap-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.9fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Member, email, receipt or reference" className="pl-9" aria-label="Search payments" />
            </div>
            <NativeSelect name="status" defaultValue={params.status ?? ""} aria-label="Filter by status">
              <option value="">Any status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </NativeSelect>
            <NativeSelect name="method" defaultValue={params.method ?? ""} aria-label="Filter by method">
              <option value="">Any method</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
            </NativeSelect>
            <Input name="from" type="date" defaultValue={params.from ?? ""} aria-label="From date" />
            <Input name="to" type="date" defaultValue={params.to ?? ""} aria-label="To date" />
            <Button type="submit" variant="primary">Filter</Button>
          </form>
        </CardContent>
        <CardContent className="px-0 pb-0 pt-0">
          {result.payments.length ? (
            <>
              <TableWrap>
                <Table>
                  <THead>
                    <TR><TH>Receipt</TH><TH>Member</TH><TH>Plan</TH><TH>Method</TH><TH>Paid on</TH><TH>Status</TH><TH className="text-right">Amount</TH><TH className="text-right">Actions</TH></TR>
                  </THead>
                  <TBody>
                    {result.payments.map((payment) => (
                      <TR key={payment.id}>
                        <TD><Link href={`/receipts/${payment.id}`} className="font-mono text-[11px] font-medium hover:text-[#514dcd]">{payment.receipt_number}</Link></TD>
                        <TD>
                          <div className="min-w-0">
                            <Link href={`/members/${payment.member_id}`} className="block truncate text-[12px] font-medium hover:text-[#514dcd]">{payment.member_name}</Link>
                            <p className="text-[10px] text-soft">{payment.member_code}</p>
                          </div>
                        </TD>
                        <TD>{payment.plan_name ?? <span className="text-soft">Unlinked</span>}</TD>
                        <TD>{PAYMENT_METHOD_LABELS[payment.method]}</TD>
                        <TD><span className="text-[11.5px]">{formatDate(payment.paid_at, auth.gym.timezone)}</span></TD>
                        <TD><StatusBadge status={payment.status} label={PAYMENT_STATUS_LABELS[payment.status]} /></TD>
                        <TD className="text-right">
                          <p className="tabular font-medium">{formatMoney(payment.amount_cents, payment.currency)}</p>
                          {payment.advance_added_cents > 0 || payment.credit_used_cents > 0 ? (
                            <p className="mt-0.5 text-[9.5px] text-soft">
                              {payment.credit_used_cents > 0 ? `advance used ${formatMoney(payment.credit_used_cents, payment.currency)}` : ""}
                              {payment.credit_used_cents > 0 && payment.advance_added_cents > 0 ? " · " : ""}
                              {payment.advance_added_cents > 0 ? `advance +${formatMoney(payment.advance_added_cents, payment.currency)}` : ""}
                            </p>
                          ) : null}
                        </TD>
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm"><Link href={`/receipts/${payment.id}`}><ReceiptText /> Receipt</Link></Button>
                            <PaymentStatusActions payment={payment} />
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
              <Pagination page={result.page} totalPages={result.totalPages} total={result.total} basePath="/payments" params={{ q: params.q, status: params.status, method: params.method, from: params.from, to: params.to, memberId: params.memberId }} />
            </>
          ) : (
            <EmptyState
              icon={<Wallet />}
              title={hasFilters ? "No payments match" : "No payments yet"}
              description={hasFilters ? "Loosen the filters or clear them to see all records." : "Record your first front-desk payment to start revenue reporting."}
              action={<RecordPaymentDialog members={members} memberships={memberships} today={today} />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
