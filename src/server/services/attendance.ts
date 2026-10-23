import "server-only";

import { randomUUID } from "node:crypto";
import { addDays, endOfMonthISO, todayISO } from "@/lib/dates";
import { checkInEligibility } from "@/lib/membership";
import { computeStreak, weeklyBuckets } from "@/lib/attendance";
import { query, queryOne } from "@/server/db/client";
import type { Attendance, AttendanceRow, MemberRow, MembershipRow } from "@/server/db/types";
import { writeAudit } from "@/server/audit";
import { getMemberById } from "./members";
import { getEligibleMembership, syncMembershipStatuses } from "./memberships";
import { resolveGymCheckInToken } from "./live-qr";

const SELECT = /* sql */ `
  SELECT a.*, p.full_name AS member_name, p.email AS member_email, p.avatar_url, gm.member_code
  FROM attendance a
  JOIN gym_members gm ON gm.id = a.member_id
  JOIN profiles p ON p.id = gm.profile_id
`;

export type AttendanceResult =
  | {
      ok: true;
      member: MemberRow;
      membership: MembershipRow | null;
      attendance: Attendance;
      date: string;
    }
  | {
      ok: false;
      code:
        | "INVALID_TOKEN"
        | "REVOKED_TOKEN"
        | "INVALID_GYM_TOKEN"
        | "EXPIRED_GYM_TOKEN"
        | "GYM_MISMATCH"
        | "MEMBER_INACTIVE"
        | "MEMBER_SUSPENDED"
        | "NO_MEMBERSHIP"
        | "MEMBERSHIP_EXPIRED"
        | "DUPLICATE_CHECK_IN";
      message: string;
      member?: MemberRow;
    };

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = (error as { message?: string }).message ?? "";
  return code === "23505" || /duplicate key|unique constraint/i.test(message);
}

async function getLatestMembership(gymId: string, memberId: string) {
  return queryOne<MembershipRow>(
    `SELECT m.*, mp.name AS plan_name, mp.duration_days, mp.duration_label, mp.benefits,
            p.full_name AS member_name, p.email AS member_email, gm.member_code
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     JOIN gym_members gm ON gm.id = m.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE m.gym_id = $1 AND m.member_id = $2
     ORDER BY m.end_date DESC LIMIT 1`,
    [gymId, memberId],
  );
}

export async function recordAttendance(input: {
  gymId: string;
  memberId: string;
  actorId: string;
  method: "qr" | "manual";
  timezone: string;
  note?: string | null;
  checkedInBy?: string | null;
}): Promise<AttendanceResult> {
  const today = todayISO(input.timezone);
  await syncMembershipStatuses(input.gymId, today);

  const member = await getMemberById(input.gymId, input.memberId);
  if (!member) {
    return { ok: false, code: "INVALID_TOKEN", message: "Member not found for this gym." };
  }

  const eligible = await getEligibleMembership(input.gymId, input.memberId, today);
  const latest = eligible ?? (await getLatestMembership(input.gymId, input.memberId));
  const eligibility = checkInEligibility({
    memberStatus: member.status,
    membership: latest
      ? { status: latest.status, startDate: latest.start_date, endDate: latest.end_date }
      : null,
    today,
  });

  if (!eligibility.allowed) {
    return { ok: false, code: eligibility.code, message: eligibility.reason, member };
  }

  const existing = await queryOne<Attendance>(
    "SELECT * FROM attendance WHERE gym_id = $1 AND member_id = $2 AND check_in_date = $3",
    [input.gymId, input.memberId, today],
  );
  if (existing) {
    return {
      ok: false,
      code: "DUPLICATE_CHECK_IN",
      message: "This member has already checked in today.",
      member,
    };
  }

  const id = randomUUID();
  try {
    await query(
      `INSERT INTO attendance (id, gym_id, member_id, check_in_date, method, checked_in_by, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.gymId,
        input.memberId,
        today,
        input.method,
        input.checkedInBy === undefined ? input.actorId : input.checkedInBy,
        input.note?.trim() || null,
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        code: "DUPLICATE_CHECK_IN",
        message: "This member has already checked in today.",
        member,
      };
    }
    throw error;
  }

  const attendance = await queryOne<Attendance>("SELECT * FROM attendance WHERE id = $1", [id]);
  if (!attendance) throw new Error("Attendance could not be saved.");

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: `attendance.${input.method}_check_in`,
    entityType: "attendance",
    entityId: id,
    metadata: { memberId: input.memberId, date: today },
  });

  return { ok: true, member, membership: latest, attendance, date: today };
}

/**
 * A member scans the QR displayed on the owner's screen. The token only
 * identifies the gym and the minute; the authenticated member's own record
 * supplies the rest, so one member can never check in another.
 */
export async function selfCheckInWithGymQr(input: {
  gymId: string;
  memberId: string;
  actorId: string;
  token: string;
  timezone: string;
}) {
  const resolved = await resolveGymCheckInToken(input.token);
  if (!resolved.ok) {
    return {
      ok: false as const,
      code: resolved.code,
      message: resolved.message,
    };
  }
  if (resolved.gym.id !== input.gymId) {
    return {
      ok: false as const,
      code: "GYM_MISMATCH" as const,
      message: "This code belongs to a different gym.",
    };
  }

  return recordAttendance({
    gymId: input.gymId,
    memberId: input.memberId,
    actorId: input.actorId,
    method: "qr",
    timezone: input.timezone,
    checkedInBy: null,
    note: "Self check-in via live gym QR",
  });
}

export async function listDailyAttendance(gymId: string, date: string) {
  return query<AttendanceRow>(
    `${SELECT} WHERE a.gym_id = $1 AND a.check_in_date = $2 ORDER BY a.checked_in_at DESC`,
    [gymId, date],
  );
}

export async function listAttendance(
  gymId: string,
  options: {
    date?: string;
    from?: string;
    to?: string;
    method?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const values: unknown[] = [gymId];
  const conditions = ["a.gym_id = $1"];
  if (options.date) {
    values.push(options.date);
    conditions.push(`a.check_in_date = $${values.length}`);
  }
  if (options.from) {
    values.push(options.from);
    conditions.push(`a.check_in_date >= $${values.length}`);
  }
  if (options.to) {
    values.push(options.to);
    conditions.push(`a.check_in_date <= $${values.length}`);
  }
  if (options.method === "qr" || options.method === "manual") {
    values.push(options.method);
    conditions.push(`a.method = $${values.length}`);
  }
  if (options.q?.trim()) {
    values.push(`%${options.q.trim()}%`);
    conditions.push(
      `(p.full_name ILIKE $${values.length} OR p.email ILIKE $${values.length} OR gm.member_code ILIKE $${values.length})`,
    );
  }
  const where = conditions.join(" AND ");
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, options.pageSize ?? 30));
  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM attendance a
     JOIN gym_members gm ON gm.id = a.member_id
     JOIN profiles p ON p.id = gm.profile_id
     WHERE ${where}`,
    values,
  );
  const rows = await query<AttendanceRow>(
    `${SELECT} WHERE ${where} ORDER BY a.checked_in_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (page - 1) * pageSize],
  );
  const total = totalRow?.total ?? 0;
  return {
    attendance: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getMemberAttendanceData(
  gymId: string,
  memberId: string,
  month: string,
  timezone: string,
) {
  const today = todayISO(timezone);
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonthISO(monthStart);
  const [recent, allDates, monthDates, totalRow, monthRow, lastRow] = await Promise.all([
    query<AttendanceRow>(
      `${SELECT} WHERE a.gym_id = $1 AND a.member_id = $2
       ORDER BY a.checked_in_at DESC LIMIT 12`,
      [gymId, memberId],
    ),
    query<{ check_in_date: string }>(
      `SELECT DISTINCT check_in_date::text AS check_in_date FROM attendance
       WHERE member_id = $1 ORDER BY check_in_date DESC`,
      [memberId],
    ),
    query<{ check_in_date: string; checked_in_at: string; method: string }>(
      `SELECT check_in_date::text, checked_in_at, method FROM attendance
       WHERE member_id = $1 AND check_in_date BETWEEN $2 AND $3
       ORDER BY checked_in_at ASC`,
      [memberId, monthStart, monthEnd],
    ),
    queryOne<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM attendance WHERE gym_id = $1 AND member_id = $2",
      [gymId, memberId],
    ),
    queryOne<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM attendance WHERE member_id = $1 AND check_in_date BETWEEN $2 AND $3",
      [memberId, monthStart, monthEnd],
    ),
    queryOne<{ checked_in_at: string }>(
      "SELECT checked_in_at FROM attendance WHERE member_id = $1 ORDER BY checked_in_at DESC LIMIT 1",
      [memberId],
    ),
  ]);
  const dates = allDates.map((row) => row.check_in_date);
  return {
    recent,
    dates,
    monthDates,
    total: totalRow?.total ?? 0,
    monthTotal: monthRow?.total ?? 0,
    lastCheckIn: lastRow?.checked_in_at ?? null,
    streak: computeStreak(dates, today),
    weekly: weeklyBuckets(dates, today),
    today,
  };
}

export async function getMemberRecentAttendance(gymId: string, memberId: string, limit = 8) {
  return query<AttendanceRow>(
    `${SELECT} WHERE a.gym_id = $1 AND a.member_id = $2
     ORDER BY a.checked_in_at DESC LIMIT $3`,
    [gymId, memberId, limit],
  );
}

export async function getAttendanceDates(gymId: string, memberId: string, days = 60) {
  const today = todayISO();
  const rows = await query<{ check_in_date: string }>(
    `SELECT check_in_date::text FROM attendance
     WHERE gym_id = $1 AND member_id = $2 AND check_in_date >= $3`,
    [gymId, memberId, addDays(today, -days)],
  );
  return rows.map((row) => row.check_in_date);
}
