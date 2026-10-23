import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatMoney, formatNumber, greetingForHour } from "@/lib/format";

describe("formatMoney", () => {
  it("treats values as integer paise", () => {
    expect(formatMoney(250000)).toContain("2,500");
    expect(formatMoney(123456)).toContain("1,234.56");
  });

  it("drops decimals for whole amounts", () => {
    expect(formatMoney(250000)).not.toContain(".00");
  });

  it("uses compact notation when requested", () => {
    expect(formatMoney(25000000, "INR", { compact: true })).toMatch(/₹\s?2\.5L/i);
  });
});

describe("formatNumber", () => {
  it("uses Indian digit grouping", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });
});

describe("formatDate", () => {
  it("formats a timestamp in the gym timezone", () => {
    expect(formatDate("2026-01-01T18:30:00Z", "Asia/Kolkata")).toBe("02 Jan 2026");
    expect(formatDate("2026-01-01T18:30:00Z", "UTC")).toBe("01 Jan 2026");
  });

  it("returns an em dash for missing values", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("supports a short day-month pattern", () => {
    expect(formatDate("2026-03-09", "UTC", "dd MMM")).toBe("09 Mar");
  });
});

describe("formatDateTime", () => {
  it("includes the time in the supplied timezone", () => {
    expect(formatDateTime("2026-01-01T18:30:00Z", "Asia/Kolkata")).toMatch(/02 Jan, 00:00/);
  });
});

describe("greetingForHour", () => {
  it("changes across the day", () => {
    expect(greetingForHour(new Date("2026-01-01T02:00:00Z"), "UTC")).toBe("Good morning");
    expect(greetingForHour(new Date("2026-01-01T12:00:00Z"), "UTC")).toBe("Good afternoon");
    expect(greetingForHour(new Date("2026-01-01T20:00:00Z"), "UTC")).toBe("Good evening");
  });

  it("treats midnight as morning", () => {
    expect(greetingForHour(new Date("2026-01-01T00:00:00Z"), "UTC")).toBe("Good morning");
  });
});
