import Link from "next/link";
import { Download, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import type { MemberRow } from "@/server/db/types";
import { listMembers } from "@/server/services/members";
import { getActivePlans } from "@/server/services/plans";
import { todayISO } from "@/lib/dates";
import { effectiveMembershipStatus } from "@/lib/membership";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader, Pagination } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/feedback";
import { AddMemberDialog } from "@/components/owner/member-forms";
import { AssignMembershipDialog } from "@/components/owner/plan-forms";

export const metadata = { title: "Members" };

function MemberStatusCell({ member, today }: { member: MemberRow; today: string }) {
  const membershipStatus = member.membership_status
    ? effectiveMembershipStatus(
        {
          status: member.membership_status,
          startDate: member.membership_start ?? today,
          endDate: member.membership_end ?? today,
        },
        today,
      )
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {membershipStatus ? (
        <StatusBadge status={membershipStatus} />
      ) : (
        <StatusBadge status="none" label="No membership" />
      )}
      {member.status !== "active" ? <StatusBadge status={member.status} /> : null}
    </div>
  );
}

type SearchParams = {
  q?: string;
  status?: string;
  membership?: string;
  planId?: string;
  sort?: string;
  direction?: string;
  page?: string;
};

export default async function MembersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await requireOwner();
  const params = await searchParams;
  const today = todayISO(auth.gym.timezone);
  const page = Number(params.page) || 1;

  const [result, plans] = await Promise.all([
    listMembers({
      gymId: auth.gym.id,
      q: params.q,
      status: params.status,
      membership: params.membership,
      planId: params.planId,
      sort: params.sort,
      direction: params.direction,
      page,
      timezone: auth.gym.timezone,
    }),
    getActivePlans(auth.gym.id),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  const hasFilters = Boolean(params.q || params.status || params.membership || params.planId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Members"
        description={`${result.total} member${result.total === 1 ? "" : "s"} in ${auth.gym.name}. Membership status is derived from each member’s current record.`}
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`/api/export/members${exportQuery ? `?${exportQuery}` : ""}`}><Download /> Export CSV</a>
            </Button>
            <AddMemberDialog today={today} />
          </>
        }
      />

      <Card className="p-4">
        <form action="/members" method="get" className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.9fr_0.9fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-soft" />
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Name, email, phone or member code" className="pl-9" aria-label="Search members" />
          </div>
          <NativeSelect name="status" defaultValue={params.status ?? ""} aria-label="Filter by member status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </NativeSelect>
          <NativeSelect name="membership" defaultValue={params.membership ?? ""} aria-label="Filter by membership">
            <option value="">Any membership</option>
            <option value="active">Currently active</option>
            <option value="expiring">Expiring in 7 days</option>
            <option value="expired">Expired or none</option>
            <option value="pending">Scheduled</option>
            <option value="none">No membership</option>
          </NativeSelect>
          <NativeSelect name="planId" defaultValue={params.planId ?? ""} aria-label="Filter by plan">
            <option value="">Any plan</option>
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </NativeSelect>
          <div className="flex gap-2">
            <NativeSelect name="sort" defaultValue={params.sort ?? "joined"} aria-label="Sort members" className="min-w-[130px]">
              <option value="joined">Newest first</option>
              <option value="name">Name</option>
              <option value="expiry">Expiry</option>
              <option value="code">Member code</option>
              <option value="status">Status</option>
            </NativeSelect>
            <Button type="submit" variant="primary"><SlidersHorizontal /> Apply</Button>
          </div>
        </form>
        {hasFilters ? (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-[11px] text-soft">Filters are applied server-side.</p>
            <Link href="/members" className="text-[11px] font-medium text-[#5652c8] hover:underline">Clear all</Link>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        {result.members.length ? (
          <>
            <div className="hidden md:block">
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>Member</TH>
                      <TH>Membership</TH>
                      <TH>Expires</TH>
                      <TH>Status</TH>
                      <TH>Joined</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {result.members.map((member) => (
                      <TR key={member.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
                            <div className="min-w-0">
                              <Link href={`/members/${member.id}`} className="block truncate text-[12.5px] font-semibold text-ink hover:text-[#514dcd]">
                                {member.full_name}
                              </Link>
                              <p className="truncate text-[10.5px] text-soft">{member.email} · {member.member_code}</p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          {member.plan_name ? (
                            <div>
                              <p className="text-[12px] font-medium">{member.plan_name}</p>
                              <p className="text-[10.5px] text-soft">{member.membership_price_cents != null ? formatMoney(member.membership_price_cents) : ""}</p>
                            </div>
                          ) : (
                            <span className="text-[11.5px] text-soft">No plan</span>
                          )}
                        </TD>
                        <TD>
                          {member.membership_end ? (
                            <span className="text-[11.5px]">{formatDate(member.membership_end, auth.gym.timezone)}</span>
                          ) : (
                            <span className="text-[11.5px] text-soft">—</span>
                          )}
                        </TD>
                        <TD>
                          <MemberStatusCell member={member} today={today} />
                        </TD>
                        <TD><span className="text-[11.5px]">{formatDate(member.joined_at, auth.gym.timezone)}</span></TD>
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <AssignMembershipDialog members={[]} plans={plans} defaultStart={today} memberId={member.id} label="Assign" size="sm" />
                            <Button asChild variant="ghost" size="sm"><Link href={`/members/${member.id}`}>View</Link></Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </div>

            <div className="divide-y divide-line md:hidden">
              {result.members.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={member.full_name} src={member.avatar_url} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${member.id}`} className="block truncate text-[13px] font-semibold">{member.full_name}</Link>
                      <p className="truncate text-[11px] text-soft">{member.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <MemberStatusCell member={member} today={today} />
                        <span className="text-[10.5px] text-soft">{member.member_code}</span>
                      </div>
                      {member.plan_name ? (
                        <p className="mt-2 text-[11px] text-muted">
                          {member.plan_name} · ends {member.membership_end ? formatDate(member.membership_end, auth.gym.timezone) : "—"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1"><Link href={`/members/${member.id}`}>View profile</Link></Button>
                    <AssignMembershipDialog members={[]} plans={plans} defaultStart={today} memberId={member.id} label="Assign plan" size="sm" />
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              basePath="/members"
              params={{ q: params.q, status: params.status, membership: params.membership, planId: params.planId, sort: params.sort }}
            />
          </>
        ) : (
          <EmptyState
            icon={<UsersRound />}
            title={hasFilters ? "No members match those filters" : "No members yet"}
            description={hasFilters ? "Try loosening the filters, or clear them to see the full directory." : "Add your first member and share the invite link so they can activate their account."}
            action={<AddMemberDialog today={today} />}
          />
        )}
      </Card>
    </div>
  );
}
