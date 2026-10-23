import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "@/lib/utils";

describe("csvEscape", () => {
  it("leaves simple values untouched", () => {
    expect(csvEscape("Riya Kapoor")).toBe("Riya Kapoor");
    expect(csvEscape(42)).toBe("42");
  });

  it("quotes values with commas", () => {
    expect(csvEscape("Bengaluru, Karnataka")).toBe('"Bengaluru, Karnataka"');
  });

  it("doubles embedded quotes", () => {
    expect(csvEscape('The "Iron" Gym')).toBe('"The ""Iron"" Gym"');
  });

  it("quotes newlines", () => {
    expect(csvEscape("line one\nline two")).toBe('"line one\nline two"');
  });

  it("renders nullish values as empty cells", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("emits a CRLF separated document with a header row", () => {
    const csv = toCsv(["Name", "City"], [["Riya", "Bengaluru, IN"], ["Arjun", 'The "Gym"']]);
    expect(csv).toBe('Name,City\r\nRiya,"Bengaluru, IN"\r\nArjun,"The ""Gym"""');
  });
});
