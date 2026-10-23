import Link from "next/link";
import { CalendarCheck, Download, QrCode, Search, ScanLine, UserCheck } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { listAttendance, listDailyAttendance } from "@/server/services/attendance";
import { getMemberOptions } from "@/server/services/members";
import { todayISO } from "@/lib/dates";
import { formatDate, formatTime, formatNumber, timeAgo } from "@/lib/format";
import { PageHeader, Pagination, StatCard } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/feedback";
import { ManualCheckInDialog } from "@/components/owner/attendance-tools";
import { LiveCheckInQr } from "@/components/owner/live-checkin-qr";
import { getLiveCheckInQr } from "@/server/services/live-qr";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; method?: string; q?: string; page?: string }>;
}) {
  const auth = await requireOwner();
  const params = await searchParams;
  const today = todayISO(auth.gym.timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const page = Number(params.page) || 1;

  const [result, todayRows, members, liveQr] = await Promise.all([
    listAttendance(auth.gym.id, { date, method: params.method, q: params.q, page }),
    listDailyAttendance(auth.gym.id, today),
    getMemberOptions(auth.gym.id),
    getLiveCheckInQr(auth.gym.id),
  ]);

  const qrCount = result.attendance.filter((row) => row.method === "qr").length;
  const manualCount = result.attendance.filter((row) => row.method === "manual").length;
  const uniqueToday = new Set(todayRows.map((row) => row.member_id)).size;
  const exportQuery = new URLSearchParams({ date, ...(params.method ? { method: params.method } : {}) }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Front desk"
        title="Attendance"
        description={`${formatDate(today, auth.gym.timezone)} · ${uniqueToday} unique member${uniqueToday === 1 ? "" : "s"} checked in today.`}
        actions={
          <Button asChild variant="secondary">
            <a href={`/api/export/attendance?${exportQuery}`}><Download /> Export day</a>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Check-ins today" value={todayRows.length} icon={<CalendarCheck />} hint="Duplicate entries are blocked by the database" />
        <StatCard label="Members today" value={uniqueToday} icon={<UserCheck />} hint="Unique members, not entries" />
        <StatCard label="Filtered QR scans" value={qrCount} icon={<QrCode />} hint={params.method === "manual" ? "QR excluded by filter" : "Across the filtered range"} />
        <StatCard label="Filtered manual" value={manualCount} icon={<ScanLine />} hint="Front-desk entries" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <LiveCheckInQr
          initial={liveQr}
          gymName={auth.gym.name}
          selfCheckinEnabled={auth.gym.member_checkin_enabled !== false}
          manualAction={<ManualCheckInDialog members={members} />}
        />

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fafaf7] text-[#5551d4]"><CalendarCheck className="size-4" /></span>
                <div>
                  <p className="text-[12.5px] font-semibold">A calmer front desk</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    The screen owns the rotating code. Members scan it, sign in, and confirm. The server checks gym
                    membership, status, plan dates and duplicates before writing the entry.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {[
                  ["1", "Member scans", "Phone camera opens the check-in screen."],
                  ["2", "FitOS verifies", "Gym, status, plan and duplicate rules."],
                  ["3", "Entry lands", "The log and member history update instantly."],
                ].map(([step, title, body]) => (
                  <div key={step} className="flex gap-2.5">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#dedcfb] bg-[#f4f3ff] font-mono text-[9px] font-semibold text-[#5551d4]">{step}</span>
                    <p className="text-[10.5px] leading-relaxed text-muted"><span className="font-medium text-ink">{title}.</span> {body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Today, live</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[34px] font-semibold leading-none tracking-[-0.06em]">{uniqueToday}</p>
                <p className="mt-1 text-[10.5px] text-muted">unique members in</p>
              </div>
              <span className="rounded-full border border-[#cfeade] bg-[#f2fbf6] px-2 py-1 text-[9.5px] font-medium text-[#196a4e]">Live</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f0f0ec]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#5b5ce2,#9a68f7)]" style={{ width: `${Math.min(100, uniqueToday * 4)}%` }} />
            </div>
            <p className="mt-2 text-[9.5px] text-soft">A gentle nudge, not a target. Every entry is one visit per member per day.</p>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
          <CardHeader className="items-center">
            <div>
              <CardTitle>Check-in log</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {params.q || params.method || date !== today ? "Filtered results" : "Today at " + auth.gym.name}
              </p>
            </div>
            <span className="rounded-full border border-line bg-[#fbfbf8] px-2.5 py-1 text-[10.5px] font-medium text-muted">{result.total} entries</span>
          </CardHeader>
          <CardContent className="pt-4">
            <form action="/attendance" method="get" className="grid gap-2 sm:grid-cols-[1fr_150px_150px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search member" className="pl-9" aria-label="Search attendance" />
              </div>
              <Input name="date" type="date" defaultValue={date} aria-label="Attendance date" />
              <NativeSelect name="method" defaultValue={params.method ?? ""} aria-label="Filter by check-in method">
                <option value="">All methods</option>
                <option value="qr">QR scan</option>
                <option value="manual">Manual</option>
              </NativeSelect>
              <Button type="submit" variant="primary">Apply</Button>
            </form>
            {params.q || params.method || date !== today ? (
              <div className="mt-2.5">
                <Link href="/attendance" className="text-[11px] font-medium text-[#5652c8] hover:underline">Reset filters</Link>
              </div>
            ) : null}
          </CardContent>
          <CardContent className="px-0 pb-0 pt-0">
            {result.attendance.length ? (
              <>
                <TableWrap>
                  <Table>
                    <THead>
                      <TR><TH>Member</TH><TH>Date</TH><TH>Time</TH><TH>Method</TH><TH>Recorded by</TH></TR>
                    </THead>
                    <TBody>
                      {result.attendance.map((row) => (
                        <TR key={row.id}>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={row.member_name} src={row.avatar_url} size="xs" />
                              <div className="min-w-0">
                                <Link href={`/members/${row.member_id}`} className="block truncate text-[12px] font-medium hover:text-[#514dcd]">{row.member_name}</Link>
                                <p className="text-[10px] text-soft">{row.member_code}</p>
                              </div>
                            </div>
                          </TD>
                          <TD><span className="text-[11.5px]">{formatDate(row.check_in_date, auth.gym.timezone)}</span></TD>
                          <TD><span className="text-[11.5px] tabular">{formatTime(row.checked_in_at, auth.gym.timezone)}</span><span className="ml-2 text-[10px] text-soft">{timeAgo(row.checked_in_at)}</span></TD>
                          <TD>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${row.method === "qr" ? "border-[#dedcfb] bg-[#f4f3ff] text-[#514dcd]" : "border-line bg-[#f7f7f4] text-muted"}`}>
                              {row.method === "qr" ? <QrCode className="size-3" /> : <ScanLine className="size-3" />}
                              {row.method === "qr" ? "QR scan" : "Manual"}
                            </span>
                          </TD>
                          <TD><span className="text-[11.5px] text-soft">{row.checked_in_by ? "Front desk" : row.method === "qr" ? "Member" : "System"}</span></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
                <Pagination page={result.page} totalPages={result.totalPages} total={result.total} basePath="/attendance" params={{ date, method: params.method, q: params.q }} />
              </>
            ) : (
              <EmptyState
                icon={<CalendarCheck />}
                title="No check-ins for this filter"
                description="Put the live QR on screen, or use manual check-in. The log updates immediately."
              />
            )}
          </CardContent>
        </Card>

      <p className="text-center text-[10.5px] text-soft">
        {formatNumber(todayRows.length)} entries today · every entry is unique per member per day
      </p>
    </div>
  );
}
