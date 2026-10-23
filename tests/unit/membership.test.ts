import { describe, expect, it } from "vitest";
import {
  checkInEligibility,
  computeEndDate,
  daysRemaining,
  effectiveMembershipStatus,
  membershipProgress,
} from "@/lib/membership";

const base = { status: "active" as const, startDate: "2026-01-01", endDate: "2026-01-31" };

describe("computeEndDate", () => {
  it("counts the start day as day one", () => {
    expect(computeEndDate("2026-01-01", 30)).toBe("2026-01-30");
    expect(computeEndDate("2026-01-01", 1)).toBe("2026-01-01");
  });

  it("rejects invalid durations", () => {
    expect(() => computeEndDate("2026-01-01", 0)).toThrow();
    expect(() => computeEndDate("2026-01-01", -5)).toThrow();
    expect(() => computeEndDate("2026-01-01", 1.5)).toThrow();
  });
});

describe("daysRemaining", () => {
  it("never goes below zero", () => {
    expect(daysRemaining("2026-01-17", "2026-01-10")).toBe(7);
    expect(daysRemaining("2026-01-09", "2026-01-10")).toBe(0);
  });
});

describe("effectiveMembershipStatus", () => {
  it("treats a missing membership as expired", () => {
    expect(effectiveMembershipStatus(null, "2026-01-10")).toBe("expired");
  });

  it("preserves cancelled, pending and completed records", () => {
    expect(effectiveMembershipStatus({ ...base, status: "cancelled" }, "2026-01-10")).toBe("cancelled");
    expect(effectiveMembershipStatus({ ...base, status: "pending" }, "2026-01-10")).toBe("pending");
    expect(effectiveMembershipStatus({ ...base, status: "completed" }, "2026-01-10")).toBe("expired");
  });

  it("expires a record whose end date has passed", () => {
    expect(effectiveMembershipStatus({ ...base, endDate: "2026-01-09" }, "2026-01-10")).toBe("expired");
  });

  it("shows a not-yet-started record as pending", () => {
    expect(effectiveMembershipStatus({ ...base, startDate: "2026-01-11" }, "2026-01-10")).toBe("pending");
  });

  it("marks memberships ending within the window as expiring", () => {
    expect(effectiveMembershipStatus({ ...base, endDate: "2026-01-17" }, "2026-01-10")).toBe("expiring");
    expect(effectiveMembershipStatus({ ...base, endDate: "2026-01-18" }, "2026-01-10")).toBe("active");
  });
});

describe("checkInEligibility", () => {
  const activeMembership = { ...base };

  it("blocks suspended and inactive member accounts first", () => {
    const suspended = checkInEligibility({ memberStatus: "suspended", membership: activeMembership, today: "2026-01-10" });
    expect(suspended).toMatchObject({ allowed: false, code: "MEMBER_SUSPENDED" });

    const inactive = checkInEligibility({ memberStatus: "inactive", membership: activeMembership, today: "2026-01-10" });
    expect(inactive).toMatchObject({ allowed: false, code: "MEMBER_INACTIVE" });
  });

  it("requires a membership", () => {
    const result = checkInEligibility({ memberStatus: "active", membership: null, today: "2026-01-10" });
    expect(result).toMatchObject({ allowed: false, code: "NO_MEMBERSHIP" });
  });

  it("rejects expired, cancelled and not-yet-started memberships", () => {
    expect(
      checkInEligibility({
        memberStatus: "active",
        membership: { ...base, endDate: "2026-01-09" },
        today: "2026-01-10",
      }),
    ).toMatchObject({ allowed: false, code: "MEMBERSHIP_EXPIRED" });

    expect(
      checkInEligibility({
        memberStatus: "active",
        membership: { ...base, status: "cancelled" },
        today: "2026-01-10",
      }),
    ).toMatchObject({ allowed: false, code: "MEMBERSHIP_EXPIRED" });

    const future = checkInEligibility({
      memberStatus: "active",
      membership: { ...base, startDate: "2026-01-11" },
      today: "2026-01-10",
    });
    expect(future.allowed).toBe(false);
  });

  it("allows active members with a live membership", () => {
    expect(checkInEligibility({ memberStatus: "active", membership: activeMembership, today: "2026-01-10" })).toEqual({
      allowed: true,
    });
  });
});

describe("membershipProgress", () => {
  it("counts the start and end days inclusively", () => {
    expect(membershipProgress("2026-01-01", "2026-01-10", "2026-01-01")).toBe(10);
    expect(membershipProgress("2026-01-01", "2026-01-10", "2026-01-10")).toBe(100);
  });

  it("clamps progress outside the term", () => {
    expect(membershipProgress("2026-01-01", "2026-01-10", "2025-12-01")).toBe(0);
    expect(membershipProgress("2026-01-01", "2026-01-10", "2026-02-01")).toBe(100);
  });
});
