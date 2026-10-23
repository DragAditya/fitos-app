import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CreditCard,
  Flame,
  QrCode,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getCurrentMembership, derivedStatus } from "@/server/services/memberships";
import { getMemberAttendanceData } from "@/server/services/attendance";
import { getMemberPaymentSummary } from "@/server/services/payments";
import { getMemberNotifications } from "@/server/services/notifications";
import { todayISO } from "@/lib/dates";
import { formatDate, formatMoney, formatTime, greetingForHour, timeAgo, formatDayLabel } from "@/lib/format";
import { membershipProgress } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress, EmptyState } from "@/components/ui/feedback";
import { SparkBars } from "@/components/charts";

export const metadata = { title: "Home" };

export default async function MemberHomePage() {
  const auth = await requireMember();
  const today = todayISO(auth.gym.timezone);
  const month = today.slice(0, 7);
  const firstName = auth.profile.full_name.split(" ")[0];

  const [membership, attendance, payments, notifications] = await Promise.all([
    getCurrentMembership(auth.gym.id, auth.member.id),
    getMemberAttendanceData(auth.gym.id, auth.member.id, month, auth.gym.timezone),
    getMemberPaymentSummary(auth.gym.id, auth.member.id),
    getMemberNotifications(auth.gym.id, auth.member.id, { limit: 3 }),
  ]);

  const status = derivedStatus(membership, today);
  const unread = notifications.filter((item) => !item.read_at);
  const weekly = attendance.weekly.map((bucket) => ({
    label: formatDayLabel(bucket.date),
    value: bucket.count,
    visited: bucket.visited,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={auth.profile.full_name} size="lg" ring />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">
            {greetingForHour(new Date(), auth.gym.timezone)}
          </p>
          <h1 className="truncate text-[22px] font-semibold tracking-[-0.045em]">{firstName}</h1>
          <p className="truncate text-[11.5px] text-muted">{auth.gym.name} · {auth.member.member_code}</p>
        </div>
      </div>

      {membership ? (
        <Card className="overflow-hidden">
          <div className="relative p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[radial-gradient(circle,rgba(91,92,226,.16),transparent_70%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d58ce]">Your membership</p>
                <p className="mt-1.5 text-[19px] font-semibold tracking-[-0.035em]">{membership.plan_name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {formatDate(membership.start_date, auth.gym.timezone)} → {formatDate(membership.end_date, auth.gym.timezone)}
                </p>
              </div>
              <StatusBadge status={status} />
            </div>
            {status === "active" ? (
              <div className="relative mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-soft">
                  <span>Progress</span>
                  <span>{membershipProgress(membership.start_date, membership.end_date, today)}%</span>
                </div>
                <Progress value={membershipProgress(membership.start_date, membership.end_date, today)} />
              </div>
            ) : null}
            <div className="relative mt-5 flex gap-2">
              <Button asChild variant="gradient" size="sm" className="flex-1">
                <Link href="/me/qr"><QrCode /> Check in</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link href="/me/membership">Details</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={<CreditCard />}
          title="No active membership"
          description="Ask the front desk to put you on a plan. Once assigned, check-in and visit history activate automatically."
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-[#5551d4]">
            <CalendarCheck className="size-3.5" />
          </span>
          <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.045em]">{attendance.monthTotal}</p>
          <p className="mt-1.5 text-[10.5px] text-muted">visits this month</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-warning">
            <Flame className="size-3.5" />
          </span>
          <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.045em]">{attendance.streak}</p>
          <p className="mt-1.5 text-[10.5px] text-muted">day streak</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-center">
          <div>
            <CardTitle>This week</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Last seven days of visits</p>
          </div>
          <Link href="/me/attendance" className="text-[11.5px] font-medium text-[#5652c8] hover:underline">
            Full history
          </Link>
        </CardHeader>
        <CardContent className="pt-5">
          <SparkBars data={weekly} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-positive">
              <Wallet className="size-3.5" />
            </span>
            <Link href="/me/payments" className="text-[11px] font-medium text-[#5652c8] hover:underline">Billing</Link>
          </div>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{formatMoney(payments.paid, auth.gym.currency)}</p>
          <p className="mt-1 text-[10.5px] text-muted">
            {payments.outstanding > 0 ? `${formatMoney(payments.outstanding, auth.gym.currency)} outstanding` : "All settled"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-[#5551d4]">
              <ReceiptText className="size-3.5" />
            </span>
            <Link href="/me/payments" className="text-[11px] font-medium text-[#5652c8] hover:underline">Receipts</Link>
          </div>
          <p className="mt-3 text-[18px] font-semibold tracking-[-0.035em]">{payments.count}</p>
          <p className="mt-1 text-[10.5px] text-muted">payment{payments.count === 1 ? "" : "s"} on record</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-center">
          <div>
            <CardTitle>From the gym</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">{unread.length ? `${unread.length} unread` : "You are up to date"}</p>
          </div>
          <Link href="/me/notifications" className="text-[11.5px] font-medium text-[#5652c8] hover:underline">
            Open inbox
          </Link>
        </CardHeader>
        <CardContent className="pt-3">
          {notifications.length ? (
            <div className="space-y-2.5">
              {notifications.map((item) => (
                <Link
                  key={item.recipient_id}
                  href="/me/notifications"
                  className="flex items-start gap-3 rounded-[14px] border border-line p-3.5 transition-colors hover:bg-[#fbfbf8]"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-[#e0e0da]" : "accent-gradient"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{item.body}</p>
                    <p className="mt-1 text-[10px] text-soft">{timeAgo(item.created_at)}</p>
                  </div>
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-soft" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Bell />} title="No notifications yet" description="Announcements, reminders and receipts will appear here." />
          )}
        </CardContent>
      </Card>

      {attendance.recent.length ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent visits</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Latest check-ins at {auth.gym.name}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-line/80">
              {attendance.recent.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-muted">
                    <CalendarCheck className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{formatDate(entry.check_in_date, auth.gym.timezone)}</p>
                    <p className="text-[10.5px] text-soft">{entry.method === "qr" ? "QR scan" : "Manual check-in"} · {timeAgo(entry.checked_in_at)}</p>
                  </div>
                  <span className="text-[11px] tabular text-muted">{formatTime(entry.checked_in_at, auth.gym.timezone)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <p className="flex items-center justify-center gap-1.5 pb-2 text-[10px] text-soft">
        <Sparkles className="size-3" /> Manage. Track. Grow.
      </p>
    </div>
  );
}
