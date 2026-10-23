import "server-only";

import { addDays, diffDays, lastNDates, todayISO } from "@/lib/dates";
import { query, queryOne } from "@/server/db/client";
import { syncMembershipStatuses } from "./memberships";

export type ReportRange = { from: string; to: string };

export function clampReportRange(from?: string, to?: string, timezone = "Asia/Kolkata"): ReportRange {
  const today = todayISO(timezone);
  const defaultTo = today;
  const defaultFrom = addDays(today, -29);
  let safeFrom = from ?? defaultFrom;
  let safeTo = to ?? defaultTo;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!validDate.test(safeFrom)) safeFrom = defaultFrom;
  if (!validDate.test(safeTo)) safeTo = defaultTo;
  if (safeFrom > safeTo) [safeFrom, safeTo] = [safeTo, safeFrom];
  if (diffDays(safeFrom, safeTo) > 366) safeFrom = addDays(safeTo, -366);
  if (safeTo > today) safeTo = today;
  return { from: safeFrom, to: safeTo };
}

export async function getReportData(input: {
  gymId: string;
  timezone: string;
  from: string;
  to: string;
}) {
  const today = todayISO(input.timezone);
  await syncMembershipStatuses(input.gymId, today);
  const days = diffDays(input.from, input.to) + 1;

  const [summary, revenueByDay, attendanceByDay, plans, methods, statusSplit, outstanding, newMembers] =
    await Promise.all([
      queryOne<{
        revenue: number;
        pending: number;
        refunded: number;
        refunded_count: number;
        attendance: number;
        new_members: number;
        active_memberships: number;
        expired_memberships: number;
        outstanding: number;
      }>(
        `SELECT
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM payments
            WHERE gym_id = $1 AND status = 'paid'
              AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4) AS revenue,
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM payments
            WHERE gym_id = $1 AND status = 'pending'
              AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4) AS pending,
          (SELECT COALESCE(SUM(amount_cents), 0)::int FROM payments
            WHERE gym_id = $1 AND status = 'refunded'
              AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4) AS refunded,
          (SELECT COUNT(*)::int FROM payments
            WHERE gym_id = $1 AND status = 'refunded'
              AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4) AS refunded_count,
          (SELECT COUNT(*)::int FROM attendance
            WHERE gym_id = $1 AND check_in_date BETWEEN $3 AND $4) AS attendance,
          (SELECT COUNT(*)::int FROM gym_members
            WHERE gym_id = $1 AND joined_at BETWEEN $3 AND $4) AS new_members,
          (SELECT COUNT(*)::int FROM memberships
            WHERE gym_id = $1 AND status = 'active' AND end_date >= $5) AS active_memberships,
          (SELECT COUNT(*)::int FROM memberships
            WHERE gym_id = $1 AND status = 'completed' AND end_date < $5) AS expired_memberships,
          (SELECT COALESCE(SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0)), 0)::int
            FROM memberships m
            LEFT JOIN (
              SELECT membership_id, SUM(plan_applied_cents + credit_used_cents)::int AS total
              FROM payments
              WHERE gym_id = $1 AND status = 'paid' AND membership_id IS NOT NULL
              GROUP BY membership_id
            ) paid ON paid.membership_id = m.id
            WHERE m.gym_id = $1 AND m.status IN ('active', 'pending')) AS outstanding`,
        [input.gymId, input.timezone, input.from, input.to, today],
      ),
      query<{ date: string; revenue: number }>(
        `SELECT (paid_at AT TIME ZONE $2)::date::text AS date, SUM(amount_cents)::int AS revenue
         FROM payments WHERE gym_id = $1 AND status = 'paid'
           AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4
         GROUP BY 1`,
        [input.gymId, input.timezone, input.from, input.to],
      ),
      query<{ date: string; count: number }>(
        `SELECT check_in_date::text AS date, COUNT(*)::int AS count
         FROM attendance WHERE gym_id = $1 AND check_in_date BETWEEN $2 AND $3
         GROUP BY 1`,
        [input.gymId, input.from, input.to],
      ),
      query<{ name: string; count: number; value: number }>(
        `SELECT mp.name, COUNT(*)::int AS count, SUM(m.price_cents)::int AS value
         FROM memberships m
         JOIN membership_plans mp ON mp.id = m.plan_id
         WHERE m.gym_id = $1 AND m.status = 'active' AND m.end_date >= $2
         GROUP BY mp.id, mp.name ORDER BY count DESC`,
        [input.gymId, today],
      ),
      query<{ method: string; count: number; total: number }>(
        `SELECT method, COUNT(*)::int AS count, SUM(amount_cents)::int AS total
         FROM payments WHERE gym_id = $1 AND status = 'paid'
           AND (paid_at AT TIME ZONE $2)::date BETWEEN $3 AND $4
         GROUP BY method ORDER BY total DESC`,
        [input.gymId, input.timezone, input.from, input.to],
      ),
      query<{ state: string; count: number }>(
        `SELECT
           CASE
             WHEN status = 'active' AND end_date >= $2 THEN 'active'
             WHEN status = 'active' AND end_date < $2 THEN 'expired'
             WHEN status = 'pending' THEN 'pending'
             ELSE 'cancelled'
           END AS state,
           COUNT(*)::int AS count
         FROM memberships WHERE gym_id = $1
         GROUP BY 1`,
        [input.gymId, today],
      ),
      query<{ member_id: string; member_name: string; amount: number; oldest: string }>(
        `SELECT m.member_id, p.full_name AS member_name,
                SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0))::int AS amount,
                MIN(m.start_date)::text AS oldest
         FROM memberships m
         JOIN gym_members gm ON gm.id = m.member_id
         JOIN profiles p ON p.id = gm.profile_id
         LEFT JOIN (
           SELECT membership_id, SUM(plan_applied_cents + credit_used_cents)::int AS total
           FROM payments
           WHERE gym_id = $1 AND status = 'paid' AND membership_id IS NOT NULL
           GROUP BY membership_id
         ) paid ON paid.membership_id = m.id
         WHERE m.gym_id = $1 AND m.status IN ('active', 'pending')
         GROUP BY m.member_id, p.full_name
         HAVING SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0)) > 0
         ORDER BY amount DESC LIMIT 10`,
        [input.gymId],
      ),
      query<{ date: string; count: number }>(
        `SELECT joined_at::text AS date, COUNT(*)::int AS count
         FROM gym_members WHERE gym_id = $1 AND joined_at BETWEEN $2 AND $3
         GROUP BY 1`,
        [input.gymId, input.from, input.to],
      ),
    ]);

  const dates = lastNDates(input.to, Math.min(days, 92));
  if (dates[0]! < input.from) {
    const start = input.from;
    const count = diffDays(start, input.to) + 1;
    dates.splice(0, dates.length, ...lastNDates(input.to, count));
  }
  const revenueMap = new Map(revenueByDay.map((row) => [row.date, row.revenue]));
  const attendanceMap = new Map(attendanceByDay.map((row) => [row.date, row.count]));
  const registrationMap = new Map(newMembers.map((row) => [row.date, row.count]));

  return {
    range: input,
    summary: {
      revenue: summary?.revenue ?? 0,
      pending: summary?.pending ?? 0,
      refunded: summary?.refunded ?? 0,
      refundedCount: summary?.refunded_count ?? 0,
      attendance: summary?.attendance ?? 0,
      newMembers: summary?.new_members ?? 0,
      activeMemberships: summary?.active_memberships ?? 0,
      expiredMemberships: summary?.expired_memberships ?? 0,
      outstanding: summary?.outstanding ?? 0,
    },
    trend: dates.map((date) => ({
      date,
      label: date.slice(5),
      revenue: revenueMap.get(date) ?? 0,
      attendance: attendanceMap.get(date) ?? 0,
      registrations: registrationMap.get(date) ?? 0,
    })),
    plans,
    methods,
    statusSplit,
    outstandingMembers: outstanding,
  };
}
