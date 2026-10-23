"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  forgotPasswordSchema,
  joinSchema,
  loginSchema,
  ownerRegisterSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import type { ActionResult } from "@/types";
import { acceptInvite, findInvite, registerOwner, requestPasswordReset, resetPassword } from "@/server/services/accounts";
import { authenticate, createSession, destroySession } from "@/server/auth/session";
import { rateLimit, clearRateLimit } from "@/server/rate-limit";
import { failure, validationFailure } from "./helpers";
import { allowDemoLogin, showResetLink } from "@/server/env";
import { getDb } from "@/server/db/client";

async function requestMeta() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  return { ip, userAgent: headerStore.get("user-agent") };
}

export async function loginAction(
  _state: ActionResult<{ role: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ role: string }>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const { ip, userAgent } = await requestMeta();
  const limit = rateLimit(`login:${ip}:${parsed.data.email}`, 6, 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, error: result.error };

  await createSession(result.profile.id, userAgent);
  clearRateLimit(`login:${ip}:${parsed.data.email}`);
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : null;
  const role = result.profile.role;
  const destination = role === "owner" ? "/dashboard" : "/me";
  const ownerPaths = [
    "/dashboard",
    "/members",
    "/plans",
    "/attendance",
    "/payments",
    "/notifications",
    "/reports",
    "/settings",
  ];
  const memberPaths = ["/me", "/checkin"];
  const allowedPaths = role === "owner" ? ownerPaths : memberPaths;
  const allowed =
    next &&
    allowedPaths.some(
      (path) => next === path || next.startsWith(`${path}/`) || next.startsWith(`${path}?`),
    );
  redirect(allowed ? next! : destination);
}

export async function registerOwnerAction(
  _state: ActionResult<{ role: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ role: string }>> {
  const parsed = ownerRegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    gymName: formData.get("gymName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const { ip, userAgent } = await requestMeta();
  const limit = rateLimit(`register:${ip}`, 4, 300_000);
  if (!limit.ok) {
    return { ok: false, error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };
  }

  try {
    const { ownerId } = await registerOwner(parsed.data);
    await createSession(ownerId, userAgent);
  } catch (error) {
    return failure(error);
  }
  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _state: ActionResult<{ resetUrl: string | null }> | null,
  formData: FormData,
): Promise<ActionResult<{ resetUrl: string | null }>> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return validationFailure(parsed.error);
  const { ip } = await requestMeta();
  const limit = rateLimit(`forgot:${ip}:${parsed.data.email}`, 4, 300_000);
  if (!limit.ok) {
    return { ok: false, error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };
  }
  try {
    const result = await requestPasswordReset(parsed.data.email);
    return {
      ok: true,
      message:
        "If an account exists for that email, a reset link has been created. In this deployment, no email provider is configured.",
      data: {
        resetUrl: result.path && showResetLink() ? result.path : null,
      },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPasswordAction(
  _state: ActionResult<{ done: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ done: boolean }>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return {
      ok: true,
      message: "Your password has been updated. Sign in with your new password.",
      data: { done: true },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function acceptInviteAction(
  _state: ActionResult<{ role: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ role: string }>> {
  const parsed = joinSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  const { ip, userAgent } = await requestMeta();
  const limit = rateLimit(`join:${ip}`, 6, 300_000);
  if (!limit.ok) {
    return { ok: false, error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };
  }

  try {
    const invite = await acceptInvite(parsed.data);
    const db = await getDb();
    const profile = await db.query<{ id: string }>(
      "SELECT profile_id AS id FROM gym_members WHERE id = $1",
      [invite.member_id],
    );
    const profileId = profile.rows[0]?.id;
    if (!profileId) throw new Error("Invitation could not be completed.");
    await createSession(profileId, userAgent);
  } catch (error) {
    return failure(error);
  }
  redirect("/me");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function demoLoginAction(formData: FormData) {
  if (!allowDemoLogin()) redirect("/login");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await authenticate(email, password);
  if (!result.ok) redirect("/login?demoError=1");
  const { userAgent } = await requestMeta();
  await createSession(result.profile.id, userAgent);
  redirect(result.profile.role === "owner" ? "/dashboard" : "/me");
}

export async function validateInviteToken(token: string) {
  return findInvite(token);
}
