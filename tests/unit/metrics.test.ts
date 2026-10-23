import { describe, expect, it } from "vitest";
import {
  attendanceRate,
  growthPercent,
  isRevenuePayment,
  outstandingAmount,
  sumRevenue,
} from "@/lib/metrics";

const payment = (amountCents: number, status: string) => ({ amountCents, status });

describe("revenue policy", () => {
  it("counts only paid payments", () => {
    expect(isRevenuePayment("paid")).toBe(true);
    expect(isRevenuePayment("pending")).toBe(false);
    expect(isRevenuePayment("failed")).toBe(false);
    expect(isRevenuePayment("refunded")).toBe(false);
  });

  it("excludes refunded payments instead of netting them", () => {
    const payments = [
      payment(250000, "paid"),
      payment(250000, "refunded"),
      payment(90000, "pending"),
      payment(40000, "failed"),
    ];
    expect(sumRevenue(payments)).toBe(250000);
  });

  it("sums pending and failed amounts as outstanding", () => {
    const payments = [
      payment(250000, "paid"),
      payment(90000, "pending"),
      payment(40000, "failed"),
      payment(30000, "refunded"),
    ];
    expect(outstandingAmount(payments)).toBe(130000);
  });
});

describe("growthPercent", () => {
  it("computes positive and negative growth", () => {
    expect(growthPercent(120, 100)).toBe(20);
    expect(growthPercent(90, 100)).toBe(-10);
  });

  it("handles a zero baseline", () => {
    expect(growthPercent(0, 0)).toBe(0);
    expect(growthPercent(50, 0)).toBeNull();
  });

  it("rounds to one decimal place", () => {
    expect(growthPercent(1, 3)).toBe(-66.7);
  });
});

describe("attendanceRate", () => {
  it("returns the percentage of possible visits", () => {
    expect(attendanceRate(30, 10, 30)).toBe(10);
    expect(attendanceRate(15, 10, 30)).toBe(5);
  });

  it("guards against empty gyms and windows", () => {
    expect(attendanceRate(10, 0, 30)).toBe(0);
    expect(attendanceRate(10, 10, 0)).toBe(0);
  });
});
