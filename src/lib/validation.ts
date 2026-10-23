import { z } from "zod";
import { isValidISODate } from "./dates";

const isoDate = z
  .string()
  .trim()
  .refine(isValidISODate, "Enter a valid date.");

const email = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

export const ownerRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80),
    gymName: z.string().trim().min(2, "Enter your gym name.").max(100),
    email,
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
    city: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "This reset link is invalid."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const joinSchema = z
  .object({
    token: z.string().min(10),
    fullName: z.string().trim().min(2, "Enter your full name.").max(80),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the member's full name.").max(80),
  email,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  joinedAt: isoDate,
  emergencyContact: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(800).optional().or(z.literal("")),
});

export const memberUpdateSchema = memberCreateSchema.extend({
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "suspended"]),
});

export const planSchema = z.object({
  name: z.string().trim().min(2, "Give the plan a name.").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(10_000_000),
  durationDays: z.coerce
    .number()
    .int("Duration must be a whole number of days.")
    .min(1, "Duration must be at least 1 day.")
    .max(3650, "Duration is too long."),
  durationLabel: z.string().trim().min(1).max(30),
  benefitsText: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const assignMembershipSchema = z.object({
  memberId: z.string().min(1, "Choose a member."),
  planId: z.string().min(1, "Choose a plan."),
  startDate: isoDate,
});

export const paymentSchema = z.object({
  memberId: z.string().min(1, "Choose a member."),
  membershipId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than zero.").max(10_000_000),
  method: z.enum(["cash", "upi", "bank_transfer", "card"]),
  status: z.enum(["paid", "pending", "failed"]),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  paidAt: isoDate,
});

export const paymentStatusSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["paid", "pending", "failed", "refunded"]),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Add a title.").max(120),
  body: z.string().trim().min(5, "Write a message.").max(2000),
  kind: z.enum(["announcement", "expiry", "payment", "system"]).default("announcement"),
  audience: z.enum(["all", "selected"]).default("all"),
  memberIds: z.array(z.string()).default([]),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export const ownerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const gymSettingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the gym name.").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().trim().min(1),
  currency: z.enum(["INR", "USD", "GBP", "AED"]),
  logoUrl: z
    .string()
    .trim()
    .max(500, "Keep the logo URL under 500 characters.")
    .refine((value) => value === "" || /^https?:\/\//i.test(value), {
      message: "Use a full http:// or https:// image URL.",
    })
    .optional()
    .or(z.literal("")),
  memberCodePrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{2,4}$/, "Use 2–4 letters or numbers.")
    .transform((value) => value.toUpperCase()),
  memberCheckinEnabled: z.boolean(),
  reminderDays: z
    .number({ invalid_type_error: "Choose an expiry reminder window." })
    .int()
    .min(1, "Use at least 1 day.")
    .max(30, "Use 30 days or fewer."),
  receiptFooter: z
    .string()
    .trim()
    .max(280, "Keep the receipt note under 280 characters.")
    .optional()
    .or(z.literal("")),
});

export const manualCheckInSchema = z.object({
  memberId: z.string().min(1, "Choose a member."),
});

export const qrScanSchema = z.object({
  token: z.string().trim().min(10, "This QR code is not valid."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type OwnerRegisterInput = z.infer<typeof ownerRegisterSchema>;
export type MemberCreateInput = z.infer<typeof memberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;
export type GymSettingsInput = z.infer<typeof gymSettingsSchema>;
export type ManualCheckInInput = z.infer<typeof manualCheckInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
