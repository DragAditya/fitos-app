import { describe, expect, it } from "vitest";
import { computeStreak, monthlyVisitCount, weeklyBuckets } from "@/lib/attendance";

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-01-08", "2026-01-09", "2026-01-10"], "2026-01-10")).toBe(3);
  });

  it("keeps the streak alive when today has no check-in yet", () => {
    expect(computeStreak(["2026-01-08", "2026-01-09"], "2026-01-10")).toBe(2);
  });

  it("stops at the first missing day", () => {
    expect(computeStreak(["2026-01-06", "2026-01-08", "2026-01-09"], "2026-01-10")).toBe(2);
  });

  it("returns zero when neither today nor yesterday was a visit", () => {
    expect(computeStreak(["2026-01-01"], "2026-01-10")).toBe(0);
    expect(computeStreak([], "2026-01-10")).toBe(0);
  });

  it("ignores duplicate attendance rows", () => {
    expect(computeStreak(["2026-01-10", "2026-01-10", "2026-01-09"], "2026-01-10")).toBe(2);
  });
});

describe("monthlyVisitCount", () => {
  it("counts only dates in the requested month", () => {
    const dates = ["2026-01-31", "2026-02-01", "2026-02-14", "2026-03-01"];
    expect(monthlyVisitCount(dates, "2026-02")).toBe(2);
    expect(monthlyVisitCount(dates, "2025-02")).toBe(0);
  });
});

describe("weeklyBuckets", () => {
  it("returns seven buckets ending on the supplied day", () => {
    const buckets = weeklyBuckets(["2026-01-04", "2026-01-09", "2026-01-10"], "2026-01-10");
    expect(buckets).toHaveLength(7);
    expect(buckets.at(0)?.date).toBe("2026-01-04");
    expect(buckets.at(-1)?.date).toBe("2026-01-10");
    expect(buckets.filter((bucket) => bucket.visited)).toHaveLength(3);
    expect(buckets.at(-1)).toMatchObject({ date: "2026-01-10", count: 1, visited: true });
  });

  it("marks unvisited days as zero", () => {
    const bucket = weeklyBuckets([], "2026-01-10").at(-1);
    expect(bucket).toMatchObject({ count: 0, visited: false });
  });
});
