import "server-only";

import { addDays, lastNDates, startOfMonthISO, todayISO } from "@/lib/dates";
import { query, queryOne } from "@/server/db/client";
import type { AttendanceRow, MembershipRow, PaymentRow, RenewalRequest } from "@/server/db/types";
import { syncMembershipStatuses } from "./memberships";

export async function getOwnerDashboard(input: {
  gymId: string;
  timezone: string;
  days: 7 | 30;
}) {
  const today = todayISO(input.timezone);
  const monthStart = startOfMonthISO(today);
  const previousMonthEnd = addDays(monthStart, -1);
  const previousMonthStart = startOfMonthISO(previousMonthEnd);
  const expiryCutoff = addDays(today, 7);
  const trendStart = lastNDates(today, input.days)[0]!;

  await syncMembershipStatuses(input.gymId, today);

  const [metrics, attendanceRows, revenueRows, planRows, recentActivity, recentPayments, expiring, requests] =
    await Promise.all([
      queryOne<{
        active_members: number;
        today_checkins: number;
        today_members: number;
        month_revenue: number;
        previous_revenue: number;
        expiring: number;
        new_members: number;
        pending_requests: number;
        outstanding: number;
        advance_held: number;
      }>(
        `SELECT
          (SELECT COUNT(*)::int FROM gym_members WHERE gym_id = $1 AND status = 'active') AS active_members,
          (SELECT COUNT(*)::int FROM attendance WHERE gym_id = $1 AND check_in_date = $2) AS today_checkins,
          (SELECT COUNT(DISTINCT member_id)::int FROM attendance WHERE gym_id = $1 AND check_in_date = $2) AS today_members,
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM payments
            WHERE gym_id = $1 AND status = 'paid'
              AND (paid_at AT TIME ZONE $3)::date BETWEEN $4 AND $2) AS month_revenue,
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM payments
            WHERE gym_id = $1 AND status = 'paid'
              AND (paid_at AT TIME ZONE $3)::date BETWEEN $5 AND $6) AS previous_revenue,
          (SELECT COUNT(*)::int FROM memberships
            WHERE gym_id = $1 AND status = 'active' AND end_date BETWEEN $2 AND $7) AS expiring,
          (SELECT COUNT(*)::int FROM gym_members
            WHERE gym_id = $1 AND joined_at BETWEEN $4 AND $2) AS new_members,
          (SELECT COUNT(*)::int FROM renewal_requests
            WHERE gym_id = $1 AND status = 'pending') AS pending_requests,
          (SELECT COALESCE(SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0)), 0)::int
            FROM memberships m
            LEFT JOIN (
              SELECT membership_id, SUM(plan_applied_cents + credit_used_cents)::int AS total
              FROM payments
              WHERE gym_id = $1 AND status = 'paid' AND membership_id IS NOT NULL
              GROUP BY membership_id
            ) paid ON paid.membership_id = m.id
            WHERE m.gym_id = $1 AND m.status IN ('active', 'pending')) AS outstanding,
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM member_credit_ledger
            WHERE gym_id = $1) AS advance_held`,
        [
          input.gymId,
          today,
          input.timezone,
          monthStart,
          previousMonthStart,
          previousMonthEnd,
          expiryCutoff,
        ],
      ),
      query<{ check_in_date: string; count: number }>(
        `SELECT check_in_date::text, COUNT(*)::int AS count
         FROM attendance WHERE gym_id = $1 AND check_in_date >= $2
         GROUP BY check_in_date`,
        [input.gymId, trendStart],
      ),
      query<{ date: string; revenue: number }>(
        `SELECT (paid_at AT TIME ZONE $3)::date::text AS date, SUM(amount_cents)::int AS revenue
         FROM payments
         WHERE gym_id = $1 AND status = 'paid' AND (paid_at AT TIME ZONE $3)::date >= $2
         GROUP BY 1`,
        [input.gymId, trendStart, input.timezone],
      ),
      query<{ name: string; count: number; revenue: number }>(
        `SELECT mp.name, COUNT(*)::int AS count, SUM(m.price_cents)::int AS revenue
         FROM memberships m
         JOIN membership_plans mp ON mp.id = m.plan_id
         WHERE m.gym_id = $1 AND m.status = 'active' AND m.end_date >= $2
         GROUP BY mp.id, mp.name ORDER BY count DESC`,
        [input.gymId, today],
      ),
      query<AttendanceRow>(
        `SELECT a.*, p.full_name AS member_name, p.email AS member_email, p.avatar_url, gm.member_code
         FROM attendance a
         JOIN gym_members gm ON gm.id = a.member_id
         JOIN profiles p ON p.id = gm.profile_id
         WHERE a.gym_id = $1
         ORDER BY a.checked_in_at DESC LIMIT 7`,
        [input.gymId],
      ),
      query<PaymentRow>(
        `SELECT pay.*, p.full_name AS member_name, p.email AS member_email, gm.member_code,
                mp.name AS plan_name
         FROM payments pay
         JOIN gym_members gm ON gm.id = pay.member_id
         JOIN profiles p ON p.id = gm.profile_id
         LEFT JOIN memberships m ON m.id = pay.membership_id
         LEFT JOIN membership_plans mp ON mp.id = m.plan_id
         WHERE pay.gym_id = $1 ORDER BY pay.paid_at DESC LIMIT 5`,
        [input.gymId],
      ),
      query<MembershipRow>(
        `SELECT m.*, mp.name AS plan_name, mp.duration_days, mp.duration_label, mp.benefits,
                p.full_name AS member_name, p.email AS member_email, gm.member_code
         FROM memberships m
         JOIN membership_plans mp ON mp.id = m.plan_id
         JOIN gym_members gm ON gm.id = m.member_id
         JOIN profiles p ON p.id = gm.profile_id
         WHERE m.gym_id = $1 AND m.status = 'active' AND m.end_date BETWEEN $2 AND $3
         ORDER BY m.end_date ASC LIMIT 6`,
        [input.gymId, today, expiryCutoff],
      ),
      query<RenewalRequest>(
        `SELECT rr.*, p.full_name AS member_name, p.email AS member_email
         FROM renewal_requests rr
         JOIN gym_members gm ON gm.id = rr.member_id
         JOIN profiles p ON p.id = gm.profile_id
         WHERE rr.gym_id = $1 AND rr.status = 'pending'
         ORDER BY rr.created_at DESC LIMIT 5`,
        [input.gymId],
      ),
    ]);

  const attendanceMap = new Map(attendanceRows.map((row) => [row.check_in_date, row.count]));
  const revenueMap = new Map(revenueRows.map((row) => [row.date, row.revenue]));
  const dates = lastNDates(today, input.days);

  return {
    today,
    metrics: {
      activeMembers: metrics?.active_members ?? 0,
      todayCheckIns: metrics?.today_checkins ?? 0,
      todayMembers: metrics?.today_members ?? 0,
      monthRevenue: metrics?.month_revenue ?? 0,
      previousRevenue: metrics?.previous_revenue ?? 0,
      expiring: metrics?.expiring ?? 0,
      newMembers: metrics?.new_members ?? 0,
      pendingRequests: metrics?.pending_requests ?? 0,
      outstanding: metrics?.outstanding ?? 0,
      advanceHeld: metrics?.advance_held ?? 0,
    },
    chart: dates.map((date) => ({
      date,
      checkIns: attendanceMap.get(date) ?? 0,
      label: date.slice(8),
    })),
    revenueChart: dates.slice(-7).map((date) => ({
      date,
      revenue: revenueMap.get(date) ?? 0,
      label: date.slice(8),
    })),
    planDistribution: planRows,
    recentActivity,
    recentPayments,
    expiring,
    renewalRequests: requests,
    days: input.days,
  };
}
