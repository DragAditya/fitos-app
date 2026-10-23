import Link from "next/link";
import { ArrowLeft, CalendarClock, CreditCard, QrCode, Sparkles } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getCurrentMembership, getMemberMemberships, getRenewalRequestForMember, derivedStatus } from "@/server/services/memberships";
import { diffDays, todayISO } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { membershipProgress } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress, EmptyState, Alert } from "@/components/ui/feedback";
import { RenewalRequestButton } from "@/components/member/member-forms";

export const metadata = { title: "Membership" };

export default async function MemberMembershipPage() {
  const auth = await requireMember();
  const today = todayISO(auth.gym.timezone);

  const [current, history, renewal] = await Promise.all([
    getCurrentMembership(auth.gym.id, auth.member.id),
    getMemberMemberships(auth.gym.id, auth.member.id),
    getRenewalRequestForMember(auth.member.id),
  ]);

  const status = derivedStatus(current, today);
  const daysLeft = current ? diffDays(today, current.end_date) : 0;
  const progress = current ? membershipProgress(current.start_date, current.end_date, today) : 0;

  return (
    <div className="space-y-5">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Membership</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">Your plan</h1>
      </div>

      {current ? (
        <>
          <Card className="overflow-hidden">
            <div className="relative p-5">
              <div className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-[radial-gradient(circle,rgba(91,92,226,.15),transparent_70%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-[14px] border border-[#dedcfb] bg-[#f4f3ff] text-[#5551d4]">
                    <CreditCard className="size-5" />
                  </span>
                  <div>
                    <p className="text-[18px] font-semibold tracking-[-0.035em]">{current.plan_name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{current.duration_label} · {formatMoney(current.price_cents, auth.gym.currency)}</p>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[13px] border border-line bg-[#fbfbf8] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-soft">Started</p>
                  <p className="mt-1 text-[12.5px] font-medium">{formatDate(current.start_date, auth.gym.timezone)}</p>
                </div>
                <div className="rounded-[13px] border border-line bg-[#fbfbf8] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-soft">Ends</p>
                  <p className="mt-1 text-[12.5px] font-medium">{formatDate(current.end_date, auth.gym.timezone)}</p>
                </div>
              </div>

              {status === "active" ? (
                <div className="relative mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-soft">
                    <span>{daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining` : "Ends today"}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              ) : null}

              <div className="relative mt-5 flex gap-2">
                <Button asChild variant="gradient" size="sm" className="flex-1">
                  <Link href="/me/qr"><QrCode /> Open check-in scanner</Link>
                </Button>
              </div>
            </div>
          </Card>

          {current.benefits.length ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>What is included</CardTitle>
                  <p className="mt-0.5 text-[11.5px] text-muted">Benefits copied when this plan was assigned</p>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <ul className="space-y-2">
                  {current.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-[12.5px] text-[#4d4d55]">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#edf9f2] text-positive">
                        <Sparkles className="size-2.5" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Next steps</CardTitle>
                <p className="mt-0.5 text-[11.5px] text-muted">Renew early so access never lapses.</p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <RenewalRequestButton request={renewal} />
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<CreditCard />}
          title="No active membership"
          description="Visit the front desk or send a renewal request and the gym will set up your plan."
          action={<RenewalRequestButton request={renewal} />}
        />
      )}

      {status === "expiring" ? (
        <Alert variant="warning" icon={<CalendarClock />} title="Ending soon">
          Your plan ends on {formatDate(current?.end_date, auth.gym.timezone)}. Ask the front desk to renew, or send a
          renewal request above.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Plan history</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">{history.length} record{history.length === 1 ? "" : "s"} at {auth.gym.name}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {history.length ? (
            <div className="divide-y divide-line/80">
              {history.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fafaf7] text-muted">
                    <CreditCard className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{item.plan_name}</p>
                    <p className="text-[10.5px] text-soft">
                      {formatDate(item.start_date, auth.gym.timezone)} → {formatDate(item.end_date, auth.gym.timezone)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-medium tabular">{formatMoney(item.price_cents, auth.gym.currency)}</p>
                    <StatusBadge
                      status={item.status === "active" && item.end_date < today ? "expired" : item.status}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-muted">No plan history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
