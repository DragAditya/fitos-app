import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  CirclePause,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getAuth } from "@/server/auth/session";
import { queryOne } from "@/server/db/client";
import { resolveGymCheckInToken } from "@/server/services/live-qr";
import { getCurrentMembership, derivedStatus } from "@/server/services/memberships";
import { todayISO } from "@/lib/dates";
import { formatDate, formatTime } from "@/lib/format";
import { Brand } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SelfCheckInButton } from "@/components/member/self-checkin-button";

export const metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.t === "string" ? params.t : "";

  if (!token) {
    return <CheckInError title="No check-in code" message="This link is incomplete. Ask the front desk to show the live QR again." />;
  }

  const auth = await getAuth();
  if (!auth) {
    redirect(`/login?next=${encodeURIComponent(`/checkin?t=${token}`)}`);
  }

  if (auth.profile.role === "owner") {
    return (
      <CheckInShell>
        <div className="rounded-[24px] border border-line bg-white p-6 text-center shadow-[var(--shadow-soft)]">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#dedcfb] bg-[#f4f3ff] text-[#5551d4]">
            <ShieldCheck className="size-5" />
          </span>
          <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.045em]">This is a member check-in</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            The owner screen displays this code. Members scan it from their own phones. Use the attendance screen to
            show the live QR or check someone in manually.
          </p>
          <Button asChild variant="primary" className="mt-5">
            <Link href="/attendance">
              Open attendance <ArrowRight />
            </Link>
          </Button>
        </div>
      </CheckInShell>
    );
  }

  if (!auth.member || !auth.gym) {
    return <CheckInError title="Member account required" message="This account is not linked to a gym membership yet." />;
  }

  const resolved = await resolveGymCheckInToken(token);
  if (!resolved.ok) {
    return (
      <CheckInError
        title={
          resolved.code === "EXPIRED_GYM_TOKEN"
            ? "This code has expired"
            : "This isn't a valid check-in code"
        }
        message={resolved.message}
      />
    );
  }
  if (resolved.gym.id !== auth.gym.id) {
    return <CheckInError title="Wrong gym" message="This code belongs to a different gym. Scan the code at your own gym's front desk." />;
  }

  const today = todayISO(auth.gym.timezone);
  const [membership, existing] = await Promise.all([
    getCurrentMembership(auth.gym.id, auth.member.id),
    queryOne<{ checked_in_at: string | Date }>(
      "SELECT checked_in_at FROM attendance WHERE gym_id = $1 AND member_id = $2 AND check_in_date = $3",
      [auth.gym.id, auth.member.id, today],
    ),
  ]);
  const status = derivedStatus(membership, today);
  const memberActive = auth.member.status === "active";
  const selfCheckinEnabled = auth.gym.member_checkin_enabled !== false;
  const canCheckIn = Boolean(
    selfCheckinEnabled &&
      memberActive &&
      membership &&
      (status === "active" || status === "expiring"),
  );

  return (
    <CheckInShell>
      <div className="overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_30px_80px_-45px_rgba(18,18,22,.45)]">
        <div className="relative overflow-hidden bg-[#111114] px-5 py-5 text-white">
          <div className="pointer-events-none absolute inset-0 fine-grid opacity-[0.1]" />
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#625df1]/35 blur-[70px]" />
          <div className="relative flex items-center justify-between gap-3">
            <span
              className={
                selfCheckinEnabled
                  ? "inline-flex items-center gap-1.5 rounded-full border border-[#2d6b55] bg-[#14352a] px-2.5 py-1 text-[9px] font-medium text-[#a9f0d4]"
                  : "inline-flex items-center gap-1.5 rounded-full border border-[#7a5a24] bg-[#3a2b15] px-2.5 py-1 text-[9px] font-medium text-[#ffd79b]"
              }
            >
              <span
                className={
                  selfCheckinEnabled
                    ? "size-1.5 animate-pulse rounded-full bg-[#6ee7b7]"
                    : "size-1.5 rounded-full bg-[#f0b35a]"
                }
              />
              {selfCheckinEnabled ? "Live gym check-in" : "Self check-in paused"}
            </span>
            <span className="flex items-center gap-1 text-[9.5px] text-white/40">
              <ShieldCheck className="size-3" /> Server verified
            </span>
          </div>
          <h1 className="relative mt-5 text-[27px] font-semibold leading-[1.05] tracking-[-0.045em]">
            {auth.gym.name}
          </h1>
          <p className="relative mt-1.5 text-[11.5px] leading-relaxed text-white/45">
            {formatDate(today, auth.gym.timezone)} · your code is valid for this check-in.
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={auth.member.full_name} src={auth.member.avatar_url} size="lg" ring />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.025em]">{auth.member.full_name}</p>
              <p className="mt-0.5 text-[10.5px] text-soft">{auth.member.member_code}</p>
            </div>
            {membership ? <StatusBadge status={status} /> : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[13px] border border-line bg-[#fbfbf8] p-3">
              <p className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.08em] text-soft">
                <Sparkles className="size-3" /> Plan
              </p>
              <p className="mt-1 truncate text-[12px] font-medium">{membership?.plan_name ?? "No active plan"}</p>
            </div>
            <div className="rounded-[13px] border border-line bg-[#fbfbf8] p-3">
              <p className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.08em] text-soft">
                <CalendarCheck className="size-3" /> Valid until
              </p>
              <p className="mt-1 truncate text-[12px] font-medium">
                {membership ? formatDate(membership.end_date, auth.gym.timezone) : "—"}
              </p>
            </div>
          </div>

          {selfCheckinEnabled && !canCheckIn ? (
            <div className="mt-4 flex gap-2.5 rounded-[14px] border border-[#ece4d4] bg-[#fffaf0] p-3.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#9a6a13]" />
              <p className="text-[10.5px] leading-relaxed text-[#80570f]">
                {!memberActive
                  ? `Your member account is currently ${auth.member.status}. Ask the front desk to reactivate it.`
                  : membership
                    ? `Your plan is currently ${status}. The front desk can help you renew before checking in.`
                    : "You don't have a plan yet. Ask the front desk to assign one before checking in."}
              </p>
            </div>
          ) : null}

          {!selfCheckinEnabled ? (
            <div className="mt-4 flex gap-2.5 rounded-[14px] border border-[#ece4d4] bg-[#fffaf0] p-3.5">
              <CirclePause className="mt-0.5 size-3.5 shrink-0 text-[#9a6a13]" />
              <p className="text-[10.5px] leading-relaxed text-[#80570f]">
                Self check-in is paused by the gym. Ask the front desk to check you in manually.
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            {existing ? (
              <div className="rounded-[20px] border border-[#cfeade] bg-[#f2fbf6] p-5 text-center">
                <CheckCircle2 className="mx-auto size-7 text-positive" />
                <p className="mt-2 text-[15px] font-semibold text-[#145b43]">You&apos;re already checked in</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-[#3d7561]">
                  <Clock3 className="size-3" /> {formatTime(existing.checked_in_at, auth.gym.timezone)} · one visit per day
                </p>
                <Button asChild variant="secondary" className="mt-4">
                  <Link href="/me/attendance">View my visits</Link>
                </Button>
              </div>
            ) : !selfCheckinEnabled ? (
              <div className="rounded-[18px] border border-[#ece4d4] bg-[linear-gradient(160deg,#fffaf0_0%,#fffdf8_100%)] p-5 text-center">
                <CirclePause className="mx-auto size-6 text-[#9a6a13]" />
                <p className="mt-2 text-[14px] font-semibold text-[#6e4b0d]">Self check-in is paused</p>
                <p className="mx-auto mt-1 max-w-[300px] text-[11px] leading-relaxed text-[#8a6b33]">
                  The front desk can still check you in manually. Your plan and membership details are unchanged.
                </p>
              </div>
            ) : canCheckIn ? (
              <SelfCheckInButton token={token} timezone={auth.gym.timezone} />
            ) : (
              <div className="rounded-[16px] border border-line bg-[#fbfbf8] p-4 text-center">
                <p className="text-[12px] font-medium text-muted">
                  {memberActive
                    ? "Check-in is unavailable until a plan is active."
                    : "Check-in is unavailable while your account is inactive."}
                </p>
                <Button asChild variant="secondary" className="mt-3">
                  <Link href="/me/membership">View membership</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[10px] text-soft">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3" /> Membership checked on the server</span>
            <Link href="/me" className="font-medium text-[#5652c8] hover:underline">Back home</Link>
          </div>
        </div>
      </div>
    </CheckInShell>
  );
}

function CheckInShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f6f3]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 py-5">
        <div className="mb-5 flex items-center justify-between">
          <Brand href="/" markClassName="size-8" />
          <Link href="/me" className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-3" /> Member home
          </Link>
        </div>
        <div className="flex flex-1 items-center">{children}</div>
        <p className="mt-5 text-center text-[9.5px] leading-relaxed text-soft">
          FitOS never encodes your name or membership details in a QR code.
        </p>
      </div>
    </div>
  );
}

function CheckInError({ title, message }: { title: string; message: string }) {
  return (
    <CheckInShell>
      <div className="w-full rounded-[24px] border border-line bg-white p-6 text-center shadow-[var(--shadow-soft)]">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-[#f0d2cd] bg-[#fff7f5] text-[#b3453d]">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.045em]">{title}</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">{message}</p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button asChild variant="primary">
            <Link href="/me">Go to my home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/me/qr">Scan again</Link>
          </Button>
        </div>
      </div>
    </CheckInShell>
  );
}
