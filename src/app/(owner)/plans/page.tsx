import Link from "next/link";
import { CalendarClock, CreditCard, Search, Sparkles } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { listPlans } from "@/server/services/plans";
import { listMemberships, listRenewalRequests } from "@/server/services/memberships";
import { getMemberOptions } from "@/server/services/members";
import { addDays, todayISO } from "@/lib/dates";
import { formatDate, formatMoney, timeAgo } from "@/lib/format";
import { PageHeader, Pagination } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/feedback";
import { PlanDialog, PlanArchiveButton, PlanEditTrigger, AssignMembershipDialog, RenewalRequestActions } from "@/components/owner/plan-forms";

export const metadata = { title: "Memberships" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const auth = await requireOwner();
  const params = await searchParams;
  const today = todayISO(auth.gym.timezone);
  const page = Number(params.page) || 1;

  const [plans, memberships, requests, members] = await Promise.all([
    listPlans(auth.gym.id),
    listMemberships(auth.gym.id, { q: params.q, status: params.status, page, today }),
    listRenewalRequests(auth.gym.id),
    getMemberOptions(auth.gym.id),
  ]);

  const activePlans = plans.filter((plan) => !plan.archived_at);
  const pending = requests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plans & memberships"
        title="Memberships"
        description="Define what you sell, then assign it. Plan terms are copied onto each membership so history stays honest."
        actions={<PlanDialog />}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold tracking-[-0.015em]">Plans</h2>
          <p className="text-[11px] text-soft">{activePlans.length} active · {plans.length - activePlans.length} archived</p>
        </div>
        {plans.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`flex flex-col p-5 ${plan.archived_at ? "opacity-65" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                      {plan.archived_at ? <StatusBadge status="inactive" label="Archived" /> : null}
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-soft">{plan.duration_label} · {plan.duration_days} days</p>
                  </div>
                  <div className="flex items-center">
                    <PlanEditTrigger plan={plan} />
                  </div>
                </div>
                <p className="mt-3 text-[24px] font-semibold tracking-[-0.045em]">{formatMoney(plan.price_cents, auth.gym.currency)}</p>
                <p className="mt-2 min-h-[32px] text-[11.5px] leading-relaxed text-muted">{plan.description ?? "No description."}</p>
                {plan.benefits.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {plan.benefits.slice(0, 4).map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-[11px] text-[#4f4f57]">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full accent-gradient" /> {benefit}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[11px] text-muted">
                    <span className="font-semibold text-ink">{plan.active_members ?? 0}</span> active member{(plan.active_members ?? 0) === 1 ? "" : "s"}
                  </span>
                  <PlanArchiveButton plan={plan} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<CreditCard />}
              title="No plans yet"
              description="Create your first plan so you can assign memberships and record payments."
              action={<PlanDialog />}
            />
          </Card>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Renewal requests</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">Requests sent from the member app</p>
            </div>
            {pending.length ? <StatusBadge status="pending" label={`${pending.length} pending`} /> : null}
          </CardHeader>
          <CardContent className="pt-3">
            {requests.length ? (
              <div className="space-y-2.5">
                {requests.slice(0, 8).map((request) => (
                  <div key={request.id} className="rounded-[14px] border border-line p-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={request.member_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/members/${request.member_id}`} className="truncate text-[12px] font-semibold hover:text-[#514dcd]">{request.member_name}</Link>
                        <p className="mt-0.5 text-[10.5px] text-soft">{timeAgo(request.created_at)}</p>
                        {request.note ? <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{request.note}</p> : null}
                      </div>
                      {request.status === "pending" ? <RenewalRequestActions request={request} /> : <StatusBadge status={request.status === "handled" ? "active" : "inactive"} label={request.status} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[12px] text-muted">No renewal requests yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="items-center">
            <div>
              <CardTitle>All memberships</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-muted">{memberships.total} record{memberships.total === 1 ? "" : "s"}</p>
            </div>
            <AssignMembershipDialog members={members} plans={activePlans} defaultStart={today} label="Assign membership" />
          </CardHeader>
          <CardContent className="pt-4">
            <form action="/plans" method="get" className="mb-4 grid gap-2 sm:grid-cols-[1.4fr_0.8fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Member or plan" className="pl-9" aria-label="Search memberships" />
              </div>
              <NativeSelect name="status" defaultValue={params.status ?? ""} aria-label="Filter memberships">
                <option value="">Any state</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring in 7 days</option>
                <option value="expired">Expired</option>
                <option value="pending">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </NativeSelect>
              <Button type="submit" variant="primary">Filter</Button>
            </form>
          </CardContent>
          <CardContent className="px-0 pb-0 pt-0">
            {memberships.memberships.length ? (
              <>
                <TableWrap>
                  <Table>
                    <THead>
                      <TR><TH>Member</TH><TH>Plan</TH><TH>Period</TH><TH>Status</TH><TH className="text-right">Price</TH></TR>
                    </THead>
                    <TBody>
                      {memberships.memberships.map((membership) => (
                        <TR key={membership.id}>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={membership.member_name} size="xs" />
                              <div className="min-w-0">
                                <Link href={`/members/${membership.member_id}`} className="block truncate text-[12px] font-medium hover:text-[#514dcd]">{membership.member_name}</Link>
                                <p className="text-[10px] text-soft">{membership.member_code}</p>
                              </div>
                            </div>
                          </TD>
                          <TD>{membership.plan_name}</TD>
                          <TD><span className="text-[11px]">{formatDate(membership.start_date, auth.gym.timezone)} → {formatDate(membership.end_date, auth.gym.timezone)}</span></TD>
                          <TD>
                            <StatusBadge
                              status={
                                membership.status === "active" && membership.end_date < today
                                  ? "expired"
                                  : membership.status === "active" && membership.end_date <= addDays(today, 7)
                                    ? "expiring"
                                    : membership.status
                              }
                            />
                          </TD>
                          <TD className="text-right tabular">{formatMoney(membership.price_cents, auth.gym.currency)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
                <Pagination page={memberships.page} totalPages={memberships.totalPages} total={memberships.total} basePath="/plans" params={{ q: params.q, status: params.status }} />
              </>
            ) : (
              <EmptyState
                icon={<CalendarClock />}
                title="No memberships match"
                description="Assign a plan to a member, or clear the filter to see every record."
                action={<AssignMembershipDialog members={members} plans={activePlans} defaultStart={today} label="Assign membership" />}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-5 py-4">
        <Sparkles className="size-4 text-[#5551d4]" />
        <p className="text-[11.5px] leading-relaxed text-muted">
          Archived plans stay on historical memberships and can still be renewed from a member profile. Restore a plan to sell it again.
        </p>
      </div>
    </div>
  );
}
