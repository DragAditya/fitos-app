import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { execute, query, queryOne } from "@/server/db/client";
import type { Gym, MemberRow, Profile } from "@/server/db/types";
import { verifyPassword } from "./password";
import { getMemberByProfileId } from "@/server/services/members";

export const SESSION_COOKIE = "fitos_session";
const SESSION_DAYS = 30;
const DUMMY_HASH = `scrypt$fitos-dummy-salt$${Buffer.alloc(64).toString("base64url")}`;

export type AuthContext = {
  profile: Profile;
  gym: Gym | null;
  member: MemberRow | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await execute(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomBytes(16).toString("hex"), userId, hashToken(token), userAgent ?? null, expiresAt],
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await execute("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Revoke every other active session for an account while keeping the browser
 * that initiated the request signed in.
 */
export async function destroyOtherSessions(userId: string) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return 0;
  const revoked = await query<{ id: string }>(
    `DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2 RETURNING id`,
    [userId, hashToken(token)],
  );
  return revoked.length;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; profile: Profile } | { ok: false; error: string }> {
  const profile = await queryOne<Profile>("SELECT * FROM profiles WHERE email = $1 LIMIT 1", [
    email.trim().toLowerCase(),
  ]);

  const valid = await verifyPassword(password, profile?.password_hash ?? DUMMY_HASH);
  if (!profile || !valid) {
    return { ok: false, error: "The email or password is incorrect." };
  }

  if (profile.role === "member") {
    const member = await getMemberByProfileId(profile.id);
    if (!member) {
      return { ok: false, error: "This member account is not linked to a gym yet." };
    }
  }

  return { ok: true, profile };
}

export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const profile = await queryOne<Profile>(
    `SELECT p.*
     FROM sessions s
     JOIN profiles p ON p.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()
     LIMIT 1`,
    [hashToken(token)],
  );
  if (!profile) return null;

  if (profile.role === "owner") {
    const gym = await queryOne<Gym>("SELECT * FROM gyms WHERE owner_id = $1 LIMIT 1", [
      profile.id,
    ]);
    return { profile, gym, member: null };
  }

  const member = await getMemberByProfileId(profile.id);
  if (!member) return { profile, gym: null, member: null };
  const gym = await queryOne<Gym>("SELECT * FROM gyms WHERE id = $1 LIMIT 1", [member.gym_id]);
  return { profile, gym, member };
});

export type OwnerContext = AuthContext & { gym: Gym; profile: Profile & { role: "owner" } };
export type MemberContext = AuthContext & {
  gym: Gym;
  member: MemberRow;
  profile: Profile & { role: "member" };
};

export class AuthorizationError extends Error {
  status: number;
  constructor(message = "You are not authorized to perform this action.", status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireOwner(): Promise<OwnerContext> {
  const auth = await getAuth();
  if (!auth) {
    const { redirect } = await import("next/navigation");
    redirect("/login?next=/dashboard");
  }
  if (!auth || auth.profile.role !== "owner" || !auth.gym) {
    const { redirect } = await import("next/navigation");
    redirect("/unauthorized");
  }
  return auth as OwnerContext;
}

export async function requireMember(): Promise<MemberContext> {
  const auth = await getAuth();
  if (!auth) {
    const { redirect } = await import("next/navigation");
    redirect("/login?next=/me");
  }
  if (!auth || auth.profile.role !== "member" || !auth.member || !auth.gym) {
    const { redirect } = await import("next/navigation");
    redirect(!auth ? "/login?next=/me" : auth.profile.role === "owner" ? "/dashboard" : "/unauthorized");
  }
  return auth as MemberContext;
}

export async function getOwnerForApi(): Promise<OwnerContext> {
  const auth = await getAuth();
  if (!auth) throw new AuthorizationError("Please sign in.", 401);
  if (auth.profile.role !== "owner" || !auth.gym) {
    throw new AuthorizationError("Owner access is required.", 403);
  }
  return auth as OwnerContext;
}

export async function getMemberForApi(): Promise<MemberContext> {
  const auth = await getAuth();
  if (!auth) throw new AuthorizationError("Please sign in.", 401);
  if (auth.profile.role !== "member" || !auth.member || !auth.gym) {
    throw new AuthorizationError("Member access is required.", 403);
  }
  return auth as MemberContext;
}
