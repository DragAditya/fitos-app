import { NextResponse } from "next/server";
import { getOwnerForApi, AuthorizationError } from "@/server/auth/session";
import { listMembers } from "@/server/services/members";
import { listPayments } from "@/server/services/payments";
import { listAttendance } from "@/server/services/attendance";
import { listMemberships } from "@/server/services/memberships";
import { listPlans } from "@/server/services/plans";
import { clampReportRange } from "@/server/services/reports";
import { todayISO } from "@/lib/dates";
import { toCsv } from "@/lib/utils";

const EXPORTS = ["members", "payments", "attendance", "memberships", "plans"] as const;
type ExportType = (typeof EXPORTS)[number];

function csvResponse(filename: string, csv: string) {
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ type: string }> }) {
  let auth;
  try {
    auth = await getOwnerForApi();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    throw error;
  }

  const { type } = await context.params;
  if (!EXPORTS.includes(type as ExportType)) {
    return NextResponse.json({ ok: false, message: "Unknown export type." }, { status: 404 });
  }

  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const today = todayISO(auth.gym.timezone);
  const stamp = `${type}-${today}.csv`;

  if (type === "members") {
    const result = await listMembers({
      gymId: auth.gym.id,
      q: query.q,
      status: query.status,
      membership: query.membership,
      planId: query.planId,
      sort: query.sort,
      direction: query.direction,
      page: 1,
      pageSize: 50,
      timezone: auth.gym.timezone,
    });
    const csv = toCsv(
      ["Member code", "Name", "Email", "Phone", "Status", "Joined", "Plan", "Membership end", "Membership status"],
      result.members.map((member) => [
        member.member_code, member.full_name, member.email, member.phone ?? "", member.status,
        member.joined_at, member.plan_name ?? "", member.membership_end ?? "", member.membership_status ?? "",
      ]),
    );
    return csvResponse(stamp, csv);
  }

  if (type === "payments") {
    const result = await listPayments(auth.gym.id, auth.gym.timezone, {
      q: query.q,
      status: query.status,
      method: query.method,
      memberId: query.memberId,
      from: query.from,
      to: query.to,
      page: 1,
      pageSize: 100,
    });
    const csv = toCsv(
      ["Receipt", "Member code", "Member", "Plan", "Amount (INR)", "Method", "Status", "Reference", "Paid on", "Recorded source"],
      result.payments.map((payment) => [
        payment.receipt_number, payment.member_code, payment.member_name, payment.plan_name ?? "",
        (payment.amount_cents / 100).toFixed(2), payment.method, payment.status, payment.reference ?? "",
        String(payment.paid_at), "manual_entry_not_gateway_verified",
      ]),
    );
    return csvResponse(stamp, csv);
  }

  if (type === "attendance") {
    const result = await listAttendance(auth.gym.id, {
      date: query.date,
      from: query.from,
      to: query.to,
      method: query.method,
      q: query.q,
      page: 1,
      pageSize: 100,
    });
    const csv = toCsv(
      ["Date", "Time", "Member code", "Member", "Method", "Note"],
      result.attendance.map((row) => [
        row.check_in_date, new Date(row.checked_in_at).toISOString(), row.member_code,
        row.member_name, row.method, row.note ?? "",
      ]),
    );
    return csvResponse(stamp, csv);
  }

  if (type === "memberships") {
    const result = await listMemberships(auth.gym.id, {
      status: query.status,
      q: query.q,
      page: 1,
      pageSize: 100,
      today,
    });
    const csv = toCsv(
      ["Member code", "Member", "Plan", "Start", "End", "Status", "Price (INR)"],
      result.memberships.map((membership) => [
        membership.member_code, membership.member_name, membership.plan_name,
        membership.start_date, membership.end_date, membership.status,
        (membership.price_cents / 100).toFixed(2),
      ]),
    );
    return csvResponse(stamp, csv);
  }

  const range = clampReportRange(query.from, query.to, auth.gym.timezone);
  const plans = await listPlans(auth.gym.id);
  const csv = toCsv(
    ["Plan", "Price (INR)", "Duration", "Duration days", "Active members", "Archived"],
    plans.map((plan) => [
      plan.name, (plan.price_cents / 100).toFixed(2), plan.duration_label, plan.duration_days,
      plan.active_members ?? 0, plan.archived_at ? "yes" : "no",
    ]),
  );
  void range;
  return csvResponse(stamp, csv);
}
