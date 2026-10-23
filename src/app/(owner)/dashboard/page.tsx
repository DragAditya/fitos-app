import Link from "next/link";
import {
  BellRing,
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  CreditCard,
  TrendingUp,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { getOwnerDashboard } from "@/server/services/dashboard";
import { getMemberOptions } from "@/server/services/members";
import { getMembershipPaymentOptions } from "@/server/services/payments";
import { todayISO } from "@/lib/dates";
import { formatDate, formatMoney, formatTime, greetingForHour, timeAgo } from "@/lib/format";
import { PageHeader, StatCard, InlineLink } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { AreaTrendChart, DonutChart, RevenueBarChart } from "@/components/charts";
import { AddMemberDialog } from "@/components/owner/member-forms";
import { ManualCheckInDialog } from "@/components/owner/attendance-tools";
import { LiveCheckInQr } from "@/components/owner/live-checkin-qr";
import { getLiveCheckInQr } from "@/server/services/live-qr";
import { RecordPaymentDialog } from "@/components/owner/payment-forms";
import { AssignMembershipDialog, RenewalRequestActions } from "@/components/owner/plan-forms";
import { getActivePlans } from "@/server/services/plans";

export const metadata = { title: "Overview" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const auth = await requireOwner();
  const params = await searchParams;
  const days = params.days === "7" ? 7 : 30;
  const today = todayISO(auth.gym.timezone);

  const [dashboard, members, memberships, plans, liveQr] = await Promise.all([
    getOwnerDashboard({ gymId: auth.gym.id, timezone: auth.gym.timezone, days }),
    getMemberOptions(auth.gym.id),
    getMembershipPaymentOptions(auth.gym.id),
    getActivePlans(auth.gym.id),
    getLiveCheckInQr(auth.gym.id),
  ]);

  const { metrics } = dashboard;
  const growth =
    metrics.previousRevenue > 0
      ? Math.round(((metrics.monthRevenue - metrics.previousRevenue) / metrics.previousRevenue) * 100)
      : null;
  const greeting = greetingForHour(new Date(), auth.gym.timezone);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatDate(today, auth.gym.timezone)}
        title={`${greeting}, ${auth.profile.full_name.split(" ")[0]}`}
        description={`Here is how ${auth.gym.name} is moving. Every number below is read live from your database.`}
        actions={
          <>
            <RecordPaymentDialog
              members={members}
              memberships={memberships}
              today={today}
              label="Record payment"
            />
            <AddMemberDialog today={today} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={metrics.activeMembers}
          icon={<UsersRound />}
          hint={`${metrics.newMembers} joined this month`}
        />
        <StatCard
          label="Check-ins today"
          value={metrics.todayCheckIns}
          icon={<CalendarCheck />}
          hint={
            metrics.activeMembers > 0
              ? `${Math.round((metrics.todayMembers / metrics.activeMembers) * 100)}% of active members`
              : "No active members yet"
          }
        />
        <StatCard
          label="Revenue this month"
          value={formatMoney(metrics.monthRevenue, auth.gym.currency, { compact: true })}
          icon={<CircleDollarSign />}
          trend={growth}
          hint={growth === null ? "First month of trading" : "vs last month"}
        />
        <StatCard
          label="Needs attention"
          value={metrics.expiring + metrics.pendingRequests}
          icon={<Clock3 />}
          hint={`${metrics.expiring} expiring · ${metrics.pendingRequests} renewal requests`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <LiveCheckInQr
          initial={liveQr}
          gymName={auth.gym.name}
          manualAction={<ManualCheckInDialog members={members} />}
        />

        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Money at a glance</p>
              <p className="mt-1 text-[11px] text-muted">Plan balances and credit, read live.</p>
            </div>
            <div className="divide-y divide-line">
              <Link href="/members" className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fbfbf8]">
                <span className="flex items-center gap-2 text-[11.5px] text-muted"><Wallet className="size-3.5" /> Plan balance</span>
                <span className={`text-[13px] font-semibold tabular ${metrics.outstanding > 0 ? "text-danger" : "text-ink"}`}>
                  {formatMoney(metrics.outstanding, auth.gym.currency)}
                </span>
              </Link>
              <Link href="/payments" className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fbfbf8]">
                <span className="flex items-center gap-2 text-[11.5px] text-muted"><CreditCard className="size-3.5" /> Advance held</span>
                <span className="text-[13px] font-semibold tabular text-positive">
                  {formatMoney(metrics.advanceHeld, auth.gym.currency)}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="flex items-center gap-2 text-[11.5px] text-muted"><Clock3 className="size-3.5" /> Expiring soon</span>
                <span className="text-[13px] font-semibold tabular">{metrics.expiring}</span>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-[#e6e0ce] bg-[linear-gradient(150deg,#fffdf6_0%,#f5f1e6_100%)] p-5">
            <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-[#f1d58e]/20 blur-2xl" />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7441]">Front desk note</p>
            <p className="relative mt-2 text-[13px] font-medium leading-relaxed tracking-[-0.015em] text-[#403823]">
              Keep this screen open at the desk. The code rotates on its own, and every scan is verified on the server.
            </p>
            <InlineLink href="/attendance" className="relative mt-3 inline-flex">Open attendance</InlineLink>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>Attendance</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Check-ins per day · last {days} days</p>
            </div>
            <div className="flex rounded-[10px] border border-line bg-[#fbfbf8] p-0.5">
              {[
                { label: "7d", href: "/dashboard?days=7", active: days === 7 },
                { label: "30d", href: "/dashboard?days=30", active: days === 30 },
              ].map((option) => (
                <Link
                  key={option.label}
                  href={option.href}
                  className={`rounded-[8px] px-2.5 py-1 text-[10.5px] font-medium transition-colors ${option.active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <AreaTrendChart
              data={dashboard.chart.map((point) => ({ label: point.label, value: point.checkIns }))}
              ariaLabel="Daily check-ins"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Plan distribution</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Active memberships right now</p>
            </div>
            <InlineLink href="/plans">Manage</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {dashboard.planDistribution.length ? (
              <DonutChart
                data={dashboard.planDistribution.map((plan) => ({ name: plan.name, count: plan.count }))}
                totalLabel="Active"
              />
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No active memberships yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>Revenue</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {formatMoney(metrics.monthRevenue, auth.gym.currency)} collected this month
              </p>
            </div>
            <InlineLink href="/payments">Open payments</InlineLink>
          </CardHeader>
          <CardContent className="pt-2">
            <RevenueBarChart data={dashboard.revenueChart.map((point) => ({ label: point.label, value: point.revenue }))} height={210} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Renewal requests</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Sent from the member app</p>
            </div>
            <InlineLink href="/plans">All requests</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {dashboard.renewalRequests.length ? (
              <div className="space-y-2">
                {dashboard.renewalRequests.map((request) => (
                  <div key={request.id} className="rounded-[14px] border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={request.member_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold">{request.member_name}</p>
                          <p className="truncate text-[10.5px] text-soft">{request.note ?? "No note attached"}</p>
                        </div>
                      </div>
                      <RenewalRequestActions request={request} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No pending renewal requests.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="items-center">
            <div>
              <CardTitle>Recent check-ins</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Latest arrivals across all methods</p>
            </div>
            <InlineLink href="/attendance">Open attendance</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {dashboard.recentActivity.length ? (
              <div className="divide-y divide-line/80">
                {dashboard.recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={entry.member_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{entry.member_name}</p>
                      <p className="text-[10.5px] text-soft">
                        {entry.member_code} · {entry.method === "qr" ? "QR scan" : "Manual"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11.5px] font-medium tabular">{formatTime(entry.checked_in_at, auth.gym.timezone)}</p>
                      <p className="text-[10px] text-soft">{formatDate(entry.check_in_date, auth.gym.timezone)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No check-ins recorded yet. Add a member and check them in.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expiring soon</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Within the next 7 days</p>
            </div>
            <InlineLink href="/members?membership=expiring">View</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {dashboard.expiring.length ? (
              <div className="space-y-2.5">
                {dashboard.expiring.map((membership) => (
                  <div key={membership.id} className="flex items-center gap-3">
                    <Avatar name={membership.member_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium">{membership.member_name}</p>
                      <p className="text-[10.5px] text-soft">{membership.plan_name} · ends {formatDate(membership.end_date, auth.gym.timezone)}</p>
                    </div>
                    <StatusBadge status="expiring" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">Nothing expires this week.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="items-center">
            <div>
              <CardTitle>Recent payments</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Manually recorded at the front desk</p>
            </div>
            <InlineLink href="/payments">Open payments</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {dashboard.recentPayments.length ? (
              <div className="divide-y divide-line/80">
                {dashboard.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-muted">
                      <Wallet className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{payment.member_name}</p>
                      <p className="text-[10.5px] text-soft">{payment.receipt_number} · {payment.method.replaceAll("_", " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold tabular">{formatMoney(payment.amount_cents, payment.currency)}</p>
                      <p className="text-[10px] text-soft">{formatDate(payment.paid_at, auth.gym.timezone)}</p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-[12px] text-muted">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-[11px] border border-[#f0e1c4] bg-[#fffaf0] text-warning">
                  <Wallet className="size-4" />
                </span>
                <StatusBadge status="pending" label="Outstanding" />
              </div>
              <p className="mt-4 text-[24px] font-semibold tracking-[-0.04em]">{formatMoney(metrics.outstanding, auth.gym.currency)}</p>
              <p className="mt-1 text-[11px] text-muted">Pending and failed payments across the gym.</p>
              <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                <Link href="/payments?status=pending">Review balances</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-[11px] border border-[#dedcfb] bg-[#f4f3ff] text-[#5551d4]">
                  <CreditCard className="size-4" />
                </span>
                <StatusBadge status="active" label="Quick assign" />
              </div>
              <p className="mt-4 text-[13px] font-semibold">Put a member on a plan</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Assign or renew in two fields. History is preserved and the plan terms are snapshotted.
              </p>
              <div className="mt-4">
                <AssignMembershipDialog
                  members={members}
                  plans={plans}
                  defaultStart={today}
                  label="Assign membership"
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="grid size-9 place-items-center rounded-[11px] border border-line bg-[#fafaf7] text-muted">
                <BellRing className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">Keep members informed</p>
                <p className="text-[10.5px] text-soft">Last reminder activity {dashboard.recentActivity[0] ? timeAgo(dashboard.recentActivity[0].checked_in_at) : "—"}</p>
              </div>
              <Button asChild variant="ghost" size="sm"><Link href="/notifications">Open</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-[11px] bg-[#f2fbf6] text-positive">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold">{metrics.newMembers} new members joined this month</p>
            <p className="text-[10.5px] text-soft">Growth is measured from the members table, not a cached counter.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link href="/reports">Open reports</Link></Button>
          <Button asChild variant="primary" size="sm"><Link href="/members"><UserPlus /> Add another member</Link></Button>
        </div>
      </div>
    </div>
  );
}
