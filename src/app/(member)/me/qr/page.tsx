import Link from "next/link";
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock3, QrCode, ShieldCheck } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getCurrentMembership, derivedStatus } from "@/server/services/memberships";
import { queryOne } from "@/server/db/client";
import { todayISO } from "@/lib/dates";
import { formatDate, formatTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { GymCheckInScanner } from "@/components/member/gym-checkin-scanner";

export const metadata = { title: "Check in" };

export default async function MemberQrPage() {
  const auth = await requireMember();
  const today = todayISO(auth.gym.timezone);
  const [membership, todayEntry] = await Promise.all([
    getCurrentMembership(auth.gym.id, auth.member.id),
    queryOne<{ checked_in_at: string | Date; method: string }>(
      "SELECT checked_in_at, method FROM attendance WHERE member_id = $1 AND check_in_date = $2",
      [auth.member.id, today],
    ),
  ]);
  const status = derivedStatus(membership, today);

  return (
    <div className="space-y-4">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Front desk</p>
        <h1 className="mt-1 text-[25px] font-semibold tracking-[-0.045em]">Check in</h1>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          Scan the live code on the gym screen. Your plan and today&apos;s visits are checked automatically.
        </p>
      </div>

      {todayEntry ? (
        <Card className="overflow-hidden border-[#cfeade] bg-[linear-gradient(150deg,#f2fbf6_0%,#ffffff_100%)] p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d8f6e8] text-[#137956]">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#103f2e]">You&apos;re checked in today</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#3d7561]">
                <Clock3 className="size-3" /> {formatTime(todayEntry.checked_in_at, auth.gym.timezone)} · {formatDate(today, auth.gym.timezone)}
              </p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#5b8d79]">
                One visit per day. Come back tomorrow, or ask the front desk if something looks wrong.
              </p>
              <Link href="/me/attendance" className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-medium text-[#196a4e] hover:underline">
                <CalendarCheck className="size-3" /> View my visits
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-3.5">
          <p className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.1em] text-soft">
            <QrCode className="size-3" /> Plan
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="truncate text-[12.5px] font-medium">{membership?.plan_name ?? "No active plan"}</p>
            {membership ? <StatusBadge status={status} /> : null}
          </div>
          <p className="mt-1 text-[10px] text-soft">
            {membership ? `Valid until ${formatDate(membership.end_date, auth.gym.timezone)}` : "Ask the front desk to assign a plan"}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.1em] text-soft">
            <ShieldCheck className="size-3" /> Privacy
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            The displayed QR only carries a signed gym + minute token. Your identity comes from your signed-in account.
          </p>
        </Card>
      </div>

      <GymCheckInScanner />

      <p className="text-center text-[9.5px] leading-relaxed text-soft">
        Camera frames are decoded on this device and never sent to FitOS.
      </p>
    </div>
  );
}
