import { addDays, diffDays } from "./dates";

export const MEMBERSHIP_STATUSES = ["pending", "active", "completed", "cancelled"] as const;
export type StoredMembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type EffectiveMembershipStatus = "active" | "expiring" | "expired" | "cancelled" | "pending";

export type MembershipLike = {
  status: StoredMembershipStatus;
  startDate: string;
  endDate: string;
};

export type MemberAccessStatus = "active" | "inactive" | "suspended";

export function computeEndDate(startDate: string, durationDays: number): string {
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error("Duration must be a positive number of days.");
  }
  return addDays(startDate, durationDays - 1);
}

export function daysRemaining(endDate: string, today: string): number {
  return Math.max(0, diffDays(today, endDate));
}

export function effectiveMembershipStatus(
  membership: MembershipLike | null | undefined,
  today: string,
  expiringWithinDays = 7,
): EffectiveMembershipStatus {
  if (!membership) return "expired";
  if (membership.status === "cancelled") return "cancelled";
  if (membership.status === "pending") return "pending";
  if (membership.status === "completed") return "expired";
  if (membership.endDate < today) return "expired";
  if (membership.startDate > today) return "pending";
  const remaining = daysRemaining(membership.endDate, today);
  return remaining <= expiringWithinDays ? "expiring" : "active";
}

export type CheckInEligibility =
  | { allowed: true }
  | {
      allowed: false;
      code: "MEMBER_INACTIVE" | "MEMBER_SUSPENDED" | "NO_MEMBERSHIP" | "MEMBERSHIP_EXPIRED";
      reason: string;
    };

export function checkInEligibility(input: {
  memberStatus: MemberAccessStatus;
  membership: MembershipLike | null;
  today: string;
}): CheckInEligibility {
  if (input.memberStatus === "suspended") {
    return {
      allowed: false,
      code: "MEMBER_SUSPENDED",
      reason: "This membership is suspended. Contact the gym owner.",
    };
  }

  if (input.memberStatus === "inactive") {
    return {
      allowed: false,
      code: "MEMBER_INACTIVE",
      reason: "This member is inactive. Ask the owner to reactivate the account.",
    };
  }

  if (!input.membership) {
    return {
      allowed: false,
      code: "NO_MEMBERSHIP",
      reason: "No active membership was found. Assign or renew a plan first.",
    };
  }

  const status = effectiveMembershipStatus(input.membership, input.today);
  if (status === "expired" || status === "cancelled") {
    return {
      allowed: false,
      code: "MEMBERSHIP_EXPIRED",
      reason: "This membership is not active. Renew the plan before check-in.",
    };
  }

  if (status === "pending") {
    return {
      allowed: false,
      code: "MEMBERSHIP_EXPIRED",
      reason: "This membership has not started yet.",
    };
  }

  return { allowed: true };
}

export function membershipProgress(startDate: string, endDate: string, today: string): number {
  const total = Math.max(1, diffDays(startDate, endDate) + 1);
  const elapsed = Math.max(0, Math.min(total, diffDays(startDate, today) + 1));
  return Math.round((elapsed / total) * 100);
}

export const DURATION_PRESETS = [
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Six months", days: 180 },
  { label: "Annual", days: 365 },
] as const;
