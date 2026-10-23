import Link from "next/link";
import { CircleDollarSign, Download, TrendingUp, TriangleAlert, UsersRound, Wallet } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { clampReportRange, getReportData } from "@/server/services/reports";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/server/services/payments";
import { addDays } from "@/lib/dates";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/feedback";
import { AreaTrendChart, DonutChart, RevenueBarChart } from "@/components/charts";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const auth = await requireOwner();
  const params = await searchParams;
  const range = clampReportRange(params.from, params.to, auth.gym.timezone);
  const report = await getReportData({ gymId: auth.gym.id, timezone: auth.gym.timezone, ...range });
  const { summary } = report;
  const spanDays = Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86400000) + 1;
  const exportBase = `from=${range.from}&to=${range.to}`;

  const preset = (days: number) => `/reports?from=${addDays(range.to, -(days - 1))}&to=${range.to}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        description={`${formatDate(range.from, auth.gym.timezone)} → ${formatDate(range.to, auth.gym.timezone)} · ${spanDays} days. Figures are queried live, scoped to this gym only.`}
        actions={
          <>
            <Button asChild variant="secondary"><a href={`/api/export/payments?${exportBase}`}><Download /> Payments CSV</a></Button>
            <Button asChild variant="secondary"><a href={`/api/export/memberships?${exportBase}`}><Download /> Memberships CSV</a></Button>
            <Button asChild variant="secondary"><a href={`/api/export/attendance?${exportBase}`}><Download /> Attendance CSV</a></Button>
          </>
        }
      />

      <Card className="p-4">
        <form action="/reports" method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11.5px] font-medium text-muted" htmlFor="report-from">From</label>
            <Input id="report-from" name="from" type="date" defaultValue={range.from} max={range.to} />
          </div>
          <div className="min-w-[150px] flex-1">
            <label className="mb-1.5 block text-[11.5px] font-medium text-muted" htmlFor="report-to">To</label>
            <Input id="report-to" name="to" type="date" defaultValue={range.to} max={range.to} />
          </div>
          <Button type="submit" variant="primary">Apply range</Button>
          <div className="flex gap-1 rounded-[11px] border border-line bg-[#fbfbf8] p-1">
            <Link href={preset(7)} className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium text-muted hover:bg-white hover:text-ink">7d</Link>
            <Link href={preset(30)} className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium text-muted hover:bg-white hover:text-ink">30d</Link>
            <Link href={preset(90)} className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium text-muted hover:bg-white hover:text-ink">90d</Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected revenue" value={formatMoney(summary.revenue, auth.gym.currency)} icon={<CircleDollarSign />} hint={`${formatNumber(summary.attendance)} check-ins in range`} />
        <StatCard label="New members" value={summary.newMembers} icon={<UsersRound />} hint={`${summary.activeMemberships} active memberships now`} />
        <StatCard label="Outstanding" value={formatMoney(summary.outstanding, auth.gym.currency)} icon={<Wallet />} hint="Pending + failed, all time" />
        <StatCard label="Refunds" value={formatMoney(summary.refunded, auth.gym.currency)} icon={<TriangleAlert />} hint={`${summary.refundedCount} refund${summary.refundedCount === 1 ? "" : "s"} in range`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Paid payments per day inside the range</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <RevenueBarChart data={report.trend.map((point) => ({ label: point.label, value: point.revenue }))} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Membership states</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Every membership record, grouped</p>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {report.statusSplit.length ? (
              <DonutChart
                data={report.statusSplit.map((item) => ({ name: item.state, count: item.count }))}
                totalLabel="Records"
              />
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No membership records yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attendance</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Check-ins per day</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <AreaTrendChart data={report.trend.map((point) => ({ label: point.label, value: point.attendance }))} height={230} ariaLabel="Attendance trend" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Payment methods</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Paid volume in range</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {report.methods.length ? (
              <div className="space-y-3">
                {report.methods.map((method) => {
                  const max = Math.max(...report.methods.map((item) => item.total), 1);
                  return (
                    <div key={method.method}>
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="font-medium">{PAYMENT_METHOD_LABELS[method.method as keyof typeof PAYMENT_METHOD_LABELS] ?? method.method}</span>
                        <span className="tabular text-muted">{formatMoney(method.total, auth.gym.currency)} · {method.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#eeeee9]">
                        <div className="h-full rounded-full accent-gradient" style={{ width: `${Math.max(4, (method.total / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No paid payments in this range.</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <p className="text-[10.5px] text-soft">Pending</p>
                <p className="mt-1 text-[14px] font-semibold">{formatMoney(summary.pending, auth.gym.currency)}</p>
              </div>
              <div>
                <p className="text-[10.5px] text-soft">Refunded</p>
                <p className="mt-1 text-[14px] font-semibold">{formatMoney(summary.refunded, auth.gym.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="items-center">
          <div>
            <CardTitle>Members with a balance</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Pending and failed payments, grouped by member</p>
          </div>
          <Button asChild variant="secondary" size="sm"><Link href="/payments?status=pending">Open payments</Link></Button>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-3">
          {report.outstandingMembers.length ? (
            <TableWrap>
              <Table>
                <THead>
                  <TR><TH>Member</TH><TH>Oldest unpaid</TH><TH className="text-right">Balance</TH><TH className="text-right">Action</TH></TR>
                </THead>
                <TBody>
                  {report.outstandingMembers.map((member) => (
                    <TR key={member.member_id}>
                      <TD>
                        <Link href={`/members/${member.member_id}`} className="text-[12px] font-medium hover:text-[#514dcd]">{member.member_name}</Link>
                      </TD>
                      <TD><span className="text-[11.5px]">{formatDate(member.oldest, auth.gym.timezone)}</span></TD>
                      <TD className="text-right tabular font-medium text-danger">{formatMoney(member.amount, auth.gym.currency)}</TD>
                      <TD className="text-right">
                        <Button asChild variant="ghost" size="sm"><Link href={`/payments?memberId=${member.member_id}`}>View records</Link></Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState icon={<TrendingUp />} title="No outstanding balances" description="Every payment in this gym is currently settled, refunded or pending nothing." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Plan performance</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Active memberships grouped by plan (current snapshot)</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {report.plans.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {report.plans.map((plan) => (
                <div key={plan.name} className="rounded-[14px] border border-line p-4">
                  <p className="text-[12.5px] font-semibold">{plan.name}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10.5px] text-soft">Active members</p>
                      <p className="text-[19px] font-semibold tracking-[-0.04em]">{plan.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] text-soft">Recurring value</p>
                      <p className="text-[13px] font-semibold">{formatMoney(plan.value, auth.gym.currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[12px] text-muted">No active memberships to summarise.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-[10.5px] leading-relaxed text-soft">
        Definitions: revenue counts only status = paid. Refunded payments are excluded. Attendance counts check-in records. Members are counted once per day. Status labels: {Object.values(PAYMENT_STATUS_LABELS).join(", ")}.
      </p>
    </div>
  );
}
