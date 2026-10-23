import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { getMemberById, getMemberHistory } from "@/server/services/members";
import { getActivePlans } from "@/server/services/plans";
import { getMembershipPaymentOptions, getMemberAdvanceBalance } from "@/server/services/payments";
import { todayISO, addDays } from "@/lib/dates";
import { formatDate, formatMoney, formatTime, timeAgo } from "@/lib/format";
import { membershipProgress } from "@/lib/membership";
import { PageHeader, InlineLink } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Progress } from "@/components/ui/feedback";
import { DetailList, InfoRow } from "@/components/info-row";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { MemberActions, CancelMembershipButton } from "@/components/owner/member-forms";
import { AssignMembershipDialog } from "@/components/owner/plan-forms";
import { RecordPaymentDialog } from "@/components/owner/payment-forms";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  const { id } = await params;
  const today = todayISO(auth.gym.timezone);

  const member = await getMemberById(auth.gym.id, id);
  if (!member) notFound();

  const [history, plans, membershipOptions, advance] = await Promise.all([
    getMemberHistory(auth.gym.id, member.id),
    getActivePlans(auth.gym.id),
    getMembershipPaymentOptions(auth.gym.id, member.id),
    getMemberAdvanceBalance(auth.gym.id, member.id),
  ]);

  const current = history.memberships.find((item) => item.status === "active" && item.end_date >= today) ?? history.memberships[0] ?? null;
  const suggestedStart =
    current && current.status === "active" && current.end_date >= today ? addDays(current.end_date, 1) : today;
  const paidTotal = history.payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount_cents, 0);
  const outstanding = membershipOptions.reduce((sum, membership) => sum + membership.due_cents, 0);
  const currentOption = current ? membershipOptions.find((membership) => membership.id === current.id) ?? null : null;

  return (
    <div className="space-y-6">
      <Link href="/members" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> All members
      </Link>

      <PageHeader
        eyebrow={`${member.member_code} · joined ${formatDate(member.joined_at, auth.gym.timezone)}`}
        title={member.full_name}
        description={member.email}
        actions={
          <>
            <Button asChild variant="secondary"><Link href={`/members/${member.id}/edit`}><Pencil /> Edit</Link></Button>
            <MemberActions member={member} />
            <AssignMembershipDialog
              members={[]}
              plans={plans}
              defaultStart={suggestedStart}
              memberId={member.id}
              label={current ? "Renew / change plan" : "Assign plan"}
            />
          </>
        }
      />

      {member.status !== "active" ? (
        <Alert variant={member.status === "suspended" ? "danger" : "warning"} icon={<ShieldCheck />}>
          This member is <span className="font-semibold">{member.status}</span>. Check-in is blocked until you mark them active.
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar name={member.full_name} src={member.avatar_url} size="xl" ring />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold tracking-[-0.03em]">{member.full_name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={member.status} />
                    {!member.has_password ? <StatusBadge status="pending" label="Invite pending" /> : null}
                  </div>
                </div>
              </div>
              <DetailList className="mt-4">
                <InfoRow label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail className="size-3 text-soft" />{member.email}</span>} />
                <InfoRow label="Phone" value={member.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="size-3 text-soft" />{member.phone}</span> : "—"} />
                <InfoRow label="Date of birth" value={member.date_of_birth ? formatDate(member.date_of_birth, auth.gym.timezone) : "—"} />
                <InfoRow label="Address" value={member.address ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-3 text-soft" />{member.address}</span> : "—"} />
                <InfoRow label="Emergency" value={member.emergency_contact ?? "—"} />
                <InfoRow label="Account" value={member.has_password ? "Activated" : "Not activated"} />
              </DetailList>
              {member.notes ? (
                <div className="mt-3 rounded-[13px] border border-line bg-[#fbfbf8] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-soft">Notes</p>
                  <p className="mt-1.5 whitespace-pre-line text-[11.5px] leading-relaxed text-muted">{member.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-[11px] text-muted">Cash collected</p>
              <p className="mt-1.5 text-[20px] font-semibold tracking-[-0.04em]">{formatMoney(paidTotal, auth.gym.currency)}</p>
              <p className="mt-1 text-[10px] text-soft">{history.payments.length} payment{history.payments.length === 1 ? "" : "s"} · includes advance</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-muted">Plan balance</p>
              <p className={`mt-1.5 text-[20px] font-semibold tracking-[-0.04em] ${outstanding > 0 ? "text-danger" : ""}`}>{formatMoney(outstanding, auth.gym.currency)}</p>
              <p className="mt-1 text-[10px] text-soft">{outstanding > 0 ? "Current and scheduled plans" : "All plans settled"}</p>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="items-center">
              <div>
                <CardTitle>Current membership</CardTitle>
                <p className="mt-0.5 text-[11.5px] text-muted">The plan that governs access today</p>
              </div>
              {current ? <InlineLink href="/plans">All memberships</InlineLink> : null}
            </CardHeader>
            <CardContent className="pt-4">
              {current ? (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-[11px] border border-[#dedcfb] bg-[#f4f3ff] text-[#5551d4]">
                          <CreditCard className="size-4" />
                        </span>
                        <div>
                          <p className="text-[14px] font-semibold tracking-[-0.02em]">{current.plan_name}</p>
                          <p className="text-[10.5px] text-soft">{current.duration_label} · {formatMoney(current.price_cents, auth.gym.currency)}</p>
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      status={
                        current.status === "cancelled"
                          ? "cancelled"
                          : current.end_date < today
                            ? "expired"
                            : current.status === "pending"
                              ? "pending"
                              : addDays(today, 7) >= current.end_date
                                ? "expiring"
                                : "active"
                      }
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[12px] border border-line bg-[#fbfbf8] p-3">
                      <p className="text-[10px] text-soft">Started</p>
                      <p className="mt-1 text-[12px] font-medium">{formatDate(current.start_date, auth.gym.timezone)}</p>
                    </div>
                    <div className="rounded-[12px] border border-line bg-[#fbfbf8] p-3">
                      <p className="text-[10px] text-soft">Ends</p>
                      <p className="mt-1 text-[12px] font-medium">{formatDate(current.end_date, auth.gym.timezone)}</p>
                    </div>
                    <div className="rounded-[12px] border border-line bg-[#fbfbf8] p-3">
                      <p className="text-[10px] text-soft">Plan value</p>
                      <p className="mt-1 text-[12px] font-medium">{formatMoney(current.price_cents, auth.gym.currency)}</p>
                    </div>
                    <div className="rounded-[12px] border border-line bg-[#fbfbf8] p-3">
                      <p className="text-[10px] text-soft">Balance</p>
                      <p className={`mt-1 text-[12px] font-medium ${(currentOption?.due_cents ?? 0) > 0 ? "text-danger" : "text-positive"}`}>
                        {formatMoney(currentOption?.due_cents ?? 0, auth.gym.currency)}
                      </p>
                    </div>
                  </div>
                  {advance > 0 ? (
                    <div className="mt-3 flex items-center justify-between rounded-[12px] border border-[#cfeade] bg-[#f2fbf6] px-3 py-2.5">
                      <span className="text-[11px] text-[#3d7561]">Advance credit available</span>
                      <span className="text-[12px] font-semibold text-[#196a4e]">{formatMoney(advance, auth.gym.currency)}</span>
                    </div>
                  ) : null}
                  {current.status === "active" && current.end_date >= today ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[10.5px] text-soft">
                        <span>Progress</span>
                        <span>{membershipProgress(current.start_date, current.end_date, today)}%</span>
                      </div>
                      <Progress value={membershipProgress(current.start_date, current.end_date, today)} />
                    </div>
                  ) : null}
                  {current.benefits.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {current.benefits.map((benefit) => (
                        <span key={benefit} className="rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] text-muted">{benefit}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <RecordPaymentDialog
                      members={[{ id: member.id, full_name: member.full_name, member_code: member.member_code }]}
                      memberships={membershipOptions}
                      today={today}
                      defaultMemberId={member.id}
                      label="Record payment"
                      size="sm"
                    />
                    {["active", "pending"].includes(current.status) ? (
                      <CancelMembershipButton membershipId={current.id} memberId={member.id} />
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<CreditCard />}
                  title="No membership yet"
                  description="Assign a plan so this member can check in and appear in revenue reporting."
                  action={<AssignMembershipDialog members={[]} plans={plans} defaultStart={today} memberId={member.id} label="Assign a plan" size="sm" />}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>Membership history</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">{history.memberships.length} record{history.memberships.length === 1 ? "" : "s"}</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-3">
            {history.memberships.length ? (
              <TableWrap>
                <Table>
                  <THead>
                    <TR><TH>Plan</TH><TH>Period</TH><TH>Status</TH><TH className="text-right">Price</TH></TR>
                  </THead>
                  <TBody>
                    {history.memberships.map((membership) => (
                      <TR key={membership.id}>
                        <TD><span className="font-medium">{membership.plan_name}</span></TD>
                        <TD><span className="text-[11.5px]">{formatDate(membership.start_date, auth.gym.timezone)} → {formatDate(membership.end_date, auth.gym.timezone)}</span></TD>
                        <TD><StatusBadge status={membership.status === "active" && membership.end_date < today ? "expired" : membership.status} /></TD>
                        <TD className="text-right tabular">{formatMoney(membership.price_cents, auth.gym.currency)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : <p className="px-5 py-8 text-center text-[12px] text-muted">No membership history.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>Recent check-ins</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Last {Math.min(history.attendance.length, 10)} visits</p>
            </div>
            <InlineLink href="/attendance">Open attendance</InlineLink>
          </CardHeader>
          <CardContent className="pt-3">
            {history.attendance.length ? (
              <div className="divide-y divide-line/80">
                {history.attendance.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-muted">
                      <CalendarCheck className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium">{formatDate(entry.check_in_date, auth.gym.timezone)}</p>
                      <p className="text-[10.5px] text-soft">{entry.method === "qr" ? "QR scan" : "Manual"} · {timeAgo(entry.checked_in_at)}</p>
                    </div>
                    <span className="text-[11px] tabular text-muted">{formatTime(entry.checked_in_at, auth.gym.timezone)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-[12px] text-muted">No check-ins yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-center">
          <div>
            <CardTitle>Payment history</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">All manually recorded payments for this member</p>
          </div>
          <InlineLink href={`/payments?memberId=${member.id}`}>Filter in payments</InlineLink>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-3">
          {history.payments.length ? (
            <TableWrap>
              <Table>
                <THead>
                  <TR><TH>Receipt</TH><TH>Plan</TH><TH>Method</TH><TH>Paid on</TH><TH>Status</TH><TH className="text-right">Amount</TH><TH className="text-right">Receipt</TH></TR>
                </THead>
                <TBody>
                  {history.payments.map((payment) => (
                    <TR key={payment.id}>
                      <TD><span className="font-mono text-[11px]">{payment.receipt_number}</span></TD>
                      <TD>{payment.plan_name ?? "—"}</TD>
                      <TD className="capitalize">{payment.method.replaceAll("_", " ")}</TD>
                      <TD>{formatDate(payment.paid_at, auth.gym.timezone)}</TD>
                      <TD><StatusBadge status={payment.status} /></TD>
                      <TD className="text-right">
                        <p className="tabular font-medium">{formatMoney(payment.amount_cents, payment.currency)}</p>
                        <p className="mt-0.5 text-[9.5px] text-soft">
                          Plan {formatMoney(payment.plan_applied_cents, payment.currency)}
                          {payment.credit_used_cents > 0 ? ` · advance used ${formatMoney(payment.credit_used_cents, payment.currency)}` : ""}
                          {payment.advance_added_cents > 0 ? ` · advance +${formatMoney(payment.advance_added_cents, payment.currency)}` : ""}
                        </p>
                      </TD>
                      <TD className="text-right">
                        <Button asChild variant="ghost" size="sm"><Link href={`/receipts/${payment.id}`}>View</Link></Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState icon={<Wallet />} title="No payments recorded" description="Record the first payment from the membership card above." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
