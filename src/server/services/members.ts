import "server-only";

import { randomUUID } from "node:crypto";
import { addDays, todayISO } from "@/lib/dates";
import { query, queryOne, transaction } from "@/server/db/client";
import type { AttendanceRow, MemberRow, MembershipRow, PaymentRow } from "@/server/db/types";

export const MEMBER_SELECT = /* sql */ `
  SELECT gm.id, gm.gym_id, gm.profile_id, gm.member_code, gm.status, gm.joined_at,
         gm.emergency_contact, gm.notes, gm.invite_expires_at, gm.invited_email,
         gm.created_at, gm.updated_at,
         p.full_name, p.email, p.phone, p.date_of_birth, p.address, p.avatar_url,
         (p.password_hash IS NOT NULL) AS has_password,
         mem.id AS membership_id, mem.plan_id, mem.plan_name,
         mem.start_date AS membership_start, mem.end_date AS membership_end,
         mem.status AS membership_status, mem.price_cents AS membership_price_cents
  FROM gym_members gm
  JOIN profiles p ON p.id = gm.profile_id
  JOIN gyms g ON g.id = gm.gym_id
  LEFT JOIN LATERAL (
    SELECT m.id, m.plan_id, mp.name AS plan_name, m.start_date, m.end_date,
           m.status, m.price_cents
    FROM memberships m
    JOIN membership_plans mp ON mp.id = m.plan_id
    WHERE m.member_id = gm.id
    ORDER BY
      CASE WHEN m.status = 'active' AND m.end_date >= (now() AT TIME ZONE g.timezone)::date THEN 0
           WHEN m.status = 'pending' THEN 1
           WHEN m.status = 'active' THEN 2
           ELSE 3 END,
      m.end_date DESC
    LIMIT 1
  ) mem ON true
`;

export async function getMemberByProfileId(profileId: string) {
  return queryOne<MemberRow>(`${MEMBER_SELECT} WHERE gm.profile_id = $1 LIMIT 1`, [profileId]);
}

export async function getMemberById(gymId: string, memberId: string) {
  return queryOne<MemberRow>(`${MEMBER_SELECT} WHERE gm.gym_id = $1 AND gm.id = $2 LIMIT 1`, [
    gymId,
    memberId,
  ]);
}

export async function listMembers(params: {
  gymId: string;
  q?: string;
  status?: string;
  membership?: string;
  planId?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
  timezone: string;
}) {
  const today = todayISO(params.timezone);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const page = Math.max(1, params.page ?? 1);
  const values: unknown[] = [params.gymId];
  const conditions: string[] = ["gym_id = $1"];
  // Only bind today's date when a membership filter references it. Binding an
  // unused parameter makes PostgreSQL fail with "could not determine data type".
  let todayPlaceholder: string | null = null;
  const todayParam = () => {
    if (!todayPlaceholder) {
      values.push(today);
      todayPlaceholder = `$${values.length}`;
    }
    return todayPlaceholder;
  };

  if (params.q?.trim()) {
    values.push(`%${params.q.trim()}%`);
    const p = `$${values.length}`;
    conditions.push(
      `(full_name ILIKE ${p} OR email ILIKE ${p} OR COALESCE(phone, '') ILIKE ${p} OR member_code ILIKE ${p})`,
    );
  }
  if (params.status && ["active", "inactive", "suspended"].includes(params.status)) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }
  if (params.planId) {
    values.push(params.planId);
    conditions.push(`plan_id = $${values.length}`);
  }

  if (params.membership === "active") {
    conditions.push(`membership_status = 'active' AND membership_end >= ${todayParam()}`);
  } else if (params.membership === "expiring") {
    const from = todayParam();
    values.push(addDays(today, 7));
    conditions.push(
      `membership_status = 'active' AND membership_end BETWEEN ${from} AND $${values.length}`,
    );
  } else if (params.membership === "expired") {
    conditions.push(`(membership_id IS NULL OR membership_end < ${todayParam()})`);
  } else if (params.membership === "pending") {
    conditions.push("membership_status = 'pending'");
  } else if (params.membership === "none") {
    conditions.push("membership_id IS NULL");
  }

  const sorts: Record<string, string> = {
    name: "full_name",
    joined: "joined_at",
    expiry: "membership_end",
    code: "member_code",
    status: "status",
  };
  const sort = sorts[params.sort ?? "joined"] ?? "joined_at";
  const direction = params.direction === "asc" ? "ASC" : "DESC";
  const filter = conditions.join(" AND ");

  const rows = await query<MemberRow & { total_count: number }>(
    `SELECT *, COUNT(*) OVER() AS total_count FROM (${MEMBER_SELECT} WHERE gm.gym_id = $1) mv
     WHERE ${filter}
     ORDER BY ${sort} ${direction} NULLS LAST
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (page - 1) * pageSize],
  );
  const total = rows[0]?.total_count ?? 0;
  return {
    members: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createMemberRecord(input: {
  gymId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  joinedAt: string;
  emergencyContact?: string | null;
  notes?: string | null;
  inviteTokenHash?: string | null;
  inviteExpiresAt?: Date | null;
}) {
  const existing = await queryOne<{ id: string }>("SELECT id FROM profiles WHERE email = $1", [
    input.email.toLowerCase(),
  ]);
  if (existing) throw new Error("An account with this email already exists.");

  const id = randomUUID();
  const profileId = randomUUID();
  const [count, gym] = await Promise.all([
    queryOne<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM gym_members WHERE gym_id = $1",
      [input.gymId],
    ),
    queryOne<{ member_code_prefix: string }>(
      "SELECT member_code_prefix FROM gyms WHERE id = $1",
      [input.gymId],
    ),
  ]);
  const prefix = gym?.member_code_prefix?.trim().toUpperCase() || "IC";
  const memberCode = `${prefix}-${String((count?.count ?? 0) + 1).padStart(4, "0")}`;

  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO profiles (id, email, full_name, phone, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'member', now(), now())`,
      [profileId, input.email.toLowerCase(), input.fullName, input.phone || null],
    );
    await tx.query(
      `INSERT INTO gym_members
        (id, gym_id, profile_id, member_code, status, joined_at, emergency_contact, notes,
         invite_token_hash, invite_expires_at, invited_email)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10)`,
      [
        id,
        input.gymId,
        profileId,
        memberCode,
        input.joinedAt,
        input.emergencyContact || null,
        input.notes || null,
        input.inviteTokenHash ?? null,
        input.inviteExpiresAt ?? null,
        input.email.toLowerCase(),
      ],
    );
  });

  return { id, profileId, memberCode };
}

export async function updateMemberRecord(input: {
  gymId: string;
  memberId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  status: "active" | "inactive" | "suspended";
  emergencyContact?: string | null;
  notes?: string | null;
}) {
  const member = await getMemberById(input.gymId, input.memberId);
  if (!member) throw new Error("Member not found in this gym.");
  const duplicate = await queryOne<{ id: string }>(
    "SELECT id FROM profiles WHERE email = $1 AND id <> $2",
    [input.email.toLowerCase(), member.profile_id],
  );
  if (duplicate) throw new Error("That email is already in use by another account.");

  await transaction(async (tx) => {
    await tx.query(
      `UPDATE profiles SET full_name = $1, email = $2, phone = $3, date_of_birth = $4,
       address = $5, updated_at = now() WHERE id = $6`,
      [
        input.fullName,
        input.email.toLowerCase(),
        input.phone || null,
        input.dateOfBirth || null,
        input.address || null,
        member.profile_id,
      ],
    );
    await tx.query(
      `UPDATE gym_members SET status = $1, emergency_contact = $2, notes = $3, updated_at = now()
       WHERE id = $4 AND gym_id = $5`,
      [
        input.status,
        input.emergencyContact || null,
        input.notes || null,
        input.memberId,
        input.gymId,
      ],
    );
  });
}

export async function setMemberStatus(input: {
  gymId: string;
  memberId: string;
  status: "active" | "inactive" | "suspended";
}) {
  const member = await getMemberById(input.gymId, input.memberId);
  if (!member) throw new Error("Member not found in this gym.");
  await query(
    "UPDATE gym_members SET status = $1, updated_at = now() WHERE id = $2 AND gym_id = $3",
    [input.status, input.memberId, input.gymId],
  );
}

export async function getMemberHistory(gymId: string, memberId: string) {
  const [memberships, attendance, payments] = await Promise.all([
    query<MembershipRow>(
      `SELECT m.*, mp.name AS plan_name, mp.duration_days, mp.duration_label, mp.benefits,
              p.full_name AS member_name, p.email AS member_email, gm.member_code
       FROM memberships m
       JOIN membership_plans mp ON mp.id = m.plan_id
       JOIN gym_members gm ON gm.id = m.member_id
       JOIN profiles p ON p.id = gm.profile_id
       WHERE m.gym_id = $1 AND m.member_id = $2
       ORDER BY m.start_date DESC`,
      [gymId, memberId],
    ),
    query<AttendanceRow>(
      `SELECT a.*, p.full_name AS member_name, p.email AS member_email, p.avatar_url, gm.member_code
       FROM attendance a
       JOIN gym_members gm ON gm.id = a.member_id
       JOIN profiles p ON p.id = gm.profile_id
       WHERE a.gym_id = $1 AND a.member_id = $2
       ORDER BY a.checked_in_at DESC LIMIT 30`,
      [gymId, memberId],
    ),
    query<PaymentRow>(
      `SELECT pay.*, p.full_name AS member_name, p.email AS member_email, gm.member_code,
              mp.name AS plan_name
       FROM payments pay
       JOIN gym_members gm ON gm.id = pay.member_id
       JOIN profiles p ON p.id = gm.profile_id
       LEFT JOIN memberships m ON m.id = pay.membership_id
       LEFT JOIN membership_plans mp ON mp.id = m.plan_id
       WHERE pay.gym_id = $1 AND pay.member_id = $2
       ORDER BY pay.paid_at DESC`,
      [gymId, memberId],
    ),
  ]);
  return { memberships, attendance, payments };
}

export async function getMemberOptions(gymId: string) {
  return query<{
    id: string;
    full_name: string;
    email: string;
    member_code: string;
    status: string;
  }>(
    `SELECT gm.id, p.full_name, p.email, gm.member_code, gm.status
     FROM gym_members gm JOIN profiles p ON p.id = gm.profile_id
     WHERE gm.gym_id = $1 AND gm.status <> 'inactive' ORDER BY p.full_name`,
    [gymId],
  );
}
