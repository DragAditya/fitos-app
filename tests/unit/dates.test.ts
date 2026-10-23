import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  endOfMonthISO,
  isValidISODate,
  lastNDates,
  monthDays,
  startOfMonthISO,
  todayISO,
} from "@/lib/dates";

describe("todayISO", () => {
  it("uses the gym timezone rather than UTC", () => {
    const instant = new Date("2026-10-21T19:00:00Z");
    expect(todayISO("Asia/Kolkata", instant)).toBe("2026-10-22");
    expect(todayISO("UTC", instant)).toBe("2026-10-21");
  });

  it("handles a timezone that is behind UTC", () => {
    expect(todayISO("America/New_York", new Date("2026-01-01T02:00:00Z"))).toBe("2025-12-31");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles leap days", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("is a no-op for zero", () => {
    expect(addDays("2026-07-04", 0)).toBe("2026-07-04");
  });
});

describe("diffDays", () => {
  it("counts whole calendar days", () => {
    expect(diffDays("2026-01-01", "2026-12-31")).toBe(364);
    expect(diffDays("2026-01-10", "2026-01-10")).toBe(0);
    expect(diffDays("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("spans leap years", () => {
    expect(diffDays("2024-01-01", "2025-01-01")).toBe(366);
  });
});

describe("month helpers", () => {
  it("finds the last day of a month", () => {
    expect(endOfMonthISO("2024-02-10")).toBe("2024-02-29");
    expect(endOfMonthISO("2026-02-01")).toBe("2026-02-28");
    expect(endOfMonthISO("2026-12-15")).toBe("2026-12-31");
  });

  it("starts a month on the first", () => {
    expect(startOfMonthISO("2026-07-19")).toBe("2026-07-01");
  });

  it("lists every date in a month", () => {
    expect(monthDays("2024-02")).toHaveLength(29);
    expect(monthDays("2026-02")).toHaveLength(28);
    expect(monthDays("2026-04").at(-1)).toBe("2026-04-30");
  });

  it("returns the last N dates ending inclusively", () => {
    expect(lastNDates("2026-01-03", 3)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("isValidISODate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidISODate("2026-10-21")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true);
  });

  it("rejects impossible or malformed dates", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-04-31")).toBe(false);
    expect(isValidISODate("2026-1-01")).toBe(false);
    expect(isValidISODate("not-a-date")).toBe(false);
  });
});
