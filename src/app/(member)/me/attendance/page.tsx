import Link from "next/link";
import { ArrowLeft, CalendarCheck, Flame, History, Timer } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getMemberAttendanceData } from "@/server/services/attendance";
import { todayISO } from "@/lib/dates";
import { formatDate, formatTime, monthLabel, timeAgo, formatDayLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { SparkBars } from "@/components/charts";

export const metadata = { title: "Attendance" };

export default async function MemberAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const auth = await requireMember();
  const params = await searchParams;
  const today = todayISO(auth.gym.timezone);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : today.slice(0, 7);

  const data = await getMemberAttendanceData(auth.gym.id, auth.member.id, month, auth.gym.timezone);
  const weekly = data.weekly.map((bucket) => ({
    label: formatDayLabel(bucket.date),
    value: bucket.count,
    visited: bucket.visited,
  }));

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  const visited = new Set(data.monthDates.map((row) => row.check_in_date));
  const firstWeekday = new Date(Date.UTC(year!, monthNumber! - 1, 1)).getUTCDay();
  const leadingBlanks = (firstWeekday + 6) % 7;
  const isCurrentMonth = month === today.slice(0, 7);
  const previousMonth = new Date(Date.UTC(year!, monthNumber! - 2, 1)).toISOString().slice(0, 7);
  const nextMonth = new Date(Date.UTC(year!, monthNumber!, 1)).toISOString().slice(0, 7);

  return (
    <div className="space-y-5">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Attendance</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">Your visits</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-[#5551d4]"><CalendarCheck className="size-3.5" /></span>
          <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.045em]">{data.monthTotal}</p>
          <p className="mt-1.5 text-[10.5px] text-muted">visits in {monthLabel(month, auth.gym.timezone)}</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-warning"><Flame className="size-3.5" /></span>
          <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.045em]">{data.streak}</p>
          <p className="mt-1.5 text-[10.5px] text-muted">day streak right now</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-positive"><History className="size-3.5" /></span>
          <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.045em]">{data.total}</p>
          <p className="mt-1.5 text-[10.5px] text-muted">total visits all time</p>
        </Card>
        <Card className="p-4">
          <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-muted"><Timer className="size-3.5" /></span>
          <p className="mt-3 text-[14px] font-semibold leading-tight tracking-[-0.03em]">
            {data.lastCheckIn ? timeAgo(data.lastCheckIn) : "—"}
          </p>
          <p className="mt-1.5 text-[10.5px] text-muted">last check-in</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-center">
          <div>
            <CardTitle>This week</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Filled bars are days you trained</p>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <SparkBars data={weekly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-center">
          <div>
            <CardTitle>{monthLabel(month, auth.gym.timezone)}</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">{data.monthTotal} visit{data.monthTotal === 1 ? "" : "s"} this month</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm"><Link href={`/me/attendance?month=${previousMonth}`}>Prev</Link></Button>
            {!isCurrentMonth ? (
              <Button asChild variant="ghost" size="sm"><Link href="/me/attendance">Today</Link></Button>
            ) : null}
            <Button asChild variant="ghost" size="sm" className={isCurrentMonth ? "pointer-events-none opacity-40" : ""}>
              <Link href={`/me/attendance?month=${nextMonth}`}>Next</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day} className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-soft">{day}</span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <span key={`blank-${index}`} className="aspect-square rounded-[10px]" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const didVisit = visited.has(date);
              const isToday = date === today;
              return (
                <span
                  key={date}
                  className={`grid aspect-square place-items-center rounded-[10px] text-[11.5px] font-medium ${
                    didVisit
                      ? "accent-gradient text-white shadow-[0_4px_10px_-4px_rgba(78,84,232,.7)]"
                      : isToday
                        ? "border border-[#c8c6f4] bg-[#f7f6ff] text-[#5551d4]"
                        : "border border-line bg-white text-[#8f8f97]"
                  }`}
                  title={`${formatDate(date, auth.gym.timezone)}${didVisit ? " · checked in" : ""}`}
                >
                  {day}
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-soft">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[4px] accent-gradient" /> Visited</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[4px] border border-line bg-white" /> No visit</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent check-ins</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Your last {Math.min(data.recent.length, 12)} visits</p>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {data.recent.length ? (
            <div className="divide-y divide-line/80">
              {data.recent.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-muted">
                    <CalendarCheck className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{formatDate(entry.check_in_date, auth.gym.timezone)}</p>
                    <p className="text-[10.5px] text-soft">{entry.method === "qr" ? "QR scan" : "Manual check-in"}</p>
                  </div>
                  <span className="text-[11px] tabular text-muted">{formatTime(entry.checked_in_at, auth.gym.timezone)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CalendarCheck />} title="No visits recorded yet" description="Scan the live gym QR at the front desk to check in — your first visit will appear here instantly." />
          )}
        </CardContent>
      </Card>

      <Alert variant="info">
        Check-ins are recorded once per day. Scan the live code at the front desk, or ask the team to check you in manually.
      </Alert>
    </div>
  );
}
