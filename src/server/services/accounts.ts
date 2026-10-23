import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  ChangePasswordInput,
  GymSettingsInput,
  OwnerProfileInput,
  OwnerRegisterInput,
  ProfileInput,
} from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { execute, queryOne, transaction } from "@/server/db/client";
import type { Gym, Profile } from "@/server/db/types";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { writeAudit } from "@/server/audit";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function registerOwner(input: OwnerRegisterInput) {
  const existing = await queryOne<{ id: string }>("SELECT id FROM profiles WHERE email = $1", [
    input.email,
  ]);
  if (existing) {
    throw new Error("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await hashPassword(input.password);
  const ownerId = randomUUID();
  const gymId = randomUUID();
  let slug = slugify(input.gymName) || "my-gym";
  const slugExists = await queryOne<{ id: string }>("SELECT id FROM gyms WHERE slug = $1", [slug]);
  if (slugExists) slug = `${slug}-${randomBytes(2).toString("hex")}`;

  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO profiles (id, email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'owner')`,
      [ownerId, input.email, passwordHash, input.fullName.trim(), input.phone || null],
    );
    await tx.query(
      `INSERT INTO gyms (id, owner_id, name, slug, city, email, phone, timezone, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Asia/Kolkata', 'INR')`,
      [
        gymId,
        ownerId,
        input.gymName.trim(),
        slug,
        input.city || null,
        input.email,
        input.phone || null,
      ],
    );

    const templates = [
      {
        name: "Monthly",
        price: 250000,
        days: 30,
        label: "1 month",
        description: "Flexible month-to-month gym access.",
        benefits: ["Full gym floor access", "Locker access", "Progress check-in"],
      },
      {
        name: "Quarterly",
        price: 660000,
        days: 90,
        label: "3 months",
        description: "Three months of training with group classes.",
        benefits: ["Full gym floor access", "Group classes", "Recovery room"],
      },
      {
        name: "Annual",
        price: 1900000,
        days: 365,
        label: "12 months",
        description: "The complete membership, billed annually.",
        benefits: ["Everything included", "Priority booking", "Freeze up to 30 days"],
      },
    ];
    for (const plan of templates) {
      await tx.query(
        `INSERT INTO membership_plans
          (id, gym_id, name, description, price_cents, duration_days, duration_label, benefits)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[])`,
        [
          randomUUID(),
          gymId,
          plan.name,
          plan.description,
          plan.price,
          plan.days,
          plan.label,
          `{${plan.benefits.map((item) => `"${item}"`).join(",")}}`,
        ],
      );
    }
  });

  await writeAudit({
    gymId,
    actorId: ownerId,
    action: "gym.created",
    entityType: "gym",
    entityId: gymId,
    metadata: { via: "self_serve_registration" },
  });

  return { ownerId, gymId };
}

export async function createMemberInvite(input: {
  gymId: string;
  memberId: string;
  actorId: string;
  email: string;
}) {
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 7 * 86_400_000);
  await execute(
    `UPDATE gym_members SET invite_token_hash = $1, invite_expires_at = $2, invited_email = $3,
     updated_at = now() WHERE id = $4 AND gym_id = $5`,
    [hashToken(token), expires, input.email.toLowerCase(), input.memberId, input.gymId],
  );
  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "member.invited",
    entityType: "gym_member",
    entityId: input.memberId,
    metadata: { email: input.email },
  });
  return { token, expires, path: `/join/${token}` };
}

export async function findInvite(token: string) {
  return queryOne<{
    member_id: string;
    gym_id: string;
    gym_name: string;
    email: string;
    full_name: string;
    joined_at: string;
    invite_expires_at: string;
    has_password: boolean;
  }>(
    `SELECT gm.id AS member_id, gm.gym_id, g.name AS gym_name, p.email, p.full_name,
            gm.joined_at::text, gm.invite_expires_at, (p.password_hash IS NOT NULL) AS has_password
     FROM gym_members gm
     JOIN profiles p ON p.id = gm.profile_id
     JOIN gyms g ON g.id = gm.gym_id
     WHERE gm.invite_token_hash = $1 LIMIT 1`,
    [hashToken(token)],
  );
}

export async function acceptInvite(input: {
  token: string;
  fullName: string;
  phone?: string;
  password: string;
}) {
  const invite = await findInvite(input.token);
  if (!invite) throw new Error("This invitation link is invalid or has already been used.");
  if (new Date(invite.invite_expires_at).getTime() < Date.now()) {
    throw new Error("This invitation has expired. Ask the gym to send a new one.");
  }
  if (invite.has_password) {
    throw new Error("This account has already been activated. Sign in instead.");
  }
  const passwordHash = await hashPassword(input.password);
  await transaction(async (tx) => {
    await tx.query(
      `UPDATE profiles SET password_hash = $1, full_name = $2, phone = $3, updated_at = now()
       WHERE id = (SELECT profile_id FROM gym_members WHERE id = $4)`,
      [passwordHash, input.fullName.trim(), input.phone || null, invite.member_id],
    );
    await tx.query(
      `UPDATE gym_members SET invite_token_hash = null, invite_expires_at = null, updated_at = now()
       WHERE id = $1`,
      [invite.member_id],
    );
  });
  return invite;
}

export async function requestPasswordReset(email: string) {
  const profile = await queryOne<Profile>("SELECT * FROM profiles WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (!profile) return { created: false as const, path: null };

  const token = randomBytes(32).toString("base64url");
  await execute(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), profile.id, hashToken(token), new Date(Date.now() + 60 * 60_000)],
  );
  return { created: true as const, path: `/reset-password?token=${token}` };
}

export async function resetPassword(token: string, password: string) {
  const record = await queryOne<{
    id: string;
    user_id: string;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
     WHERE token_hash = $1 LIMIT 1`,
    [hashToken(token)],
  );
  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("This password reset link is invalid or has expired.");
  }
  const passwordHash = await hashPassword(password);
  await transaction(async (tx) => {
    await tx.query(
      "UPDATE profiles SET password_hash = $1, updated_at = now() WHERE id = $2",
      [passwordHash, record.user_id],
    );
    await tx.query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [record.id]);
    await tx.query("DELETE FROM sessions WHERE user_id = $1", [record.user_id]);
  });
  await writeAudit({
    gymId: null,
    actorId: record.user_id,
    action: "auth.password_reset",
    entityType: "profile",
    entityId: record.user_id,
  });
}

export async function updateProfile(profileId: string, input: ProfileInput) {
  await execute(
    `UPDATE profiles SET full_name = $1, phone = $2, date_of_birth = $3, address = $4,
     updated_at = now() WHERE id = $5`,
    [
      input.fullName.trim(),
      input.phone || null,
      input.dateOfBirth || null,
      input.address || null,
      profileId,
    ],
  );
}

export async function changePassword(profileId: string, input: ChangePasswordInput) {
  const profile = await queryOne<Profile>("SELECT * FROM profiles WHERE id = $1", [profileId]);
  if (!profile) throw new Error("Account not found.");
  const valid = await verifyPassword(input.currentPassword, profile.password_hash);
  if (!valid) throw new Error("Your current password is incorrect.");
  const hash = await hashPassword(input.newPassword);
  await execute("UPDATE profiles SET password_hash = $1, updated_at = now() WHERE id = $2", [
    hash,
    profileId,
  ]);
  await writeAudit({
    gymId: null,
    actorId: profileId,
    action: "auth.password_changed",
    entityType: "profile",
    entityId: profileId,
  });
}

export async function updateOwnerProfile(
  gymId: string,
  profileId: string,
  input: OwnerProfileInput,
) {
  await execute(
    `UPDATE profiles SET full_name = $1, phone = $2, updated_at = now() WHERE id = $3`,
    [input.fullName.trim(), input.phone || null, profileId],
  );
  await writeAudit({
    gymId,
    actorId: profileId,
    action: "profile.owner_updated",
    entityType: "profile",
    entityId: profileId,
  });
}

export async function updateGymSettings(
  gymId: string,
  actorId: string,
  input: GymSettingsInput,
) {
  await execute(
    `UPDATE gyms SET name = $1, phone = $2, email = $3, address = $4, city = $5,
     timezone = $6, currency = $7, logo_url = $8, member_code_prefix = $9,
     member_checkin_enabled = $10, reminder_days = $11, receipt_footer = $12,
     updated_at = now() WHERE id = $13`,
    [
      input.name.trim(),
      input.phone || null,
      input.email || null,
      input.address || null,
      input.city || null,
      input.timezone,
      input.currency,
      input.logoUrl || null,
      input.memberCodePrefix,
      input.memberCheckinEnabled,
      input.reminderDays,
      input.receiptFooter || null,
      gymId,
    ],
  );
  await writeAudit({
    gymId,
    actorId,
    action: "gym.settings_updated",
    entityType: "gym",
    entityId: gymId,
    metadata: {
      memberCheckinEnabled: input.memberCheckinEnabled,
      reminderDays: input.reminderDays,
      memberCodePrefix: input.memberCodePrefix,
      hasLogo: Boolean(input.logoUrl),
      hasReceiptFooter: Boolean(input.receiptFooter),
    },
  });
}

export async function getGymSettings(gymId: string) {
  return queryOne<Gym>("SELECT * FROM gyms WHERE id = $1", [gymId]);
}
