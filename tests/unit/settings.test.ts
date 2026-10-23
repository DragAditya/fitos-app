import { describe, expect, it } from "vitest";
import { gymSettingsSchema, ownerProfileSchema } from "@/lib/validation";

const base = {
  name: "HeroGYM",
  phone: "",
  email: "hello@herogym.example",
  address: "",
  city: "Mumbai",
  timezone: "Asia/Kolkata",
  currency: "INR",
  logoUrl: "",
  memberCodePrefix: "hg",
  memberCheckinEnabled: false,
  reminderDays: 7,
  receiptFooter: "",
};

describe("gymSettingsSchema", () => {
  it("normalises a valid workspace settings payload", () => {
    const parsed = gymSettingsSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.memberCodePrefix).toBe("HG");
      expect(parsed.data.memberCheckinEnabled).toBe(false);
      expect(parsed.data.reminderDays).toBe(7);
    }
  });

  it("allows a public logo URL and a receipt note", () => {
    const parsed = gymSettingsSchema.safeParse({
      ...base,
      logoUrl: "https://cdn.example.com/logo.png",
      receiptFooter: "Thank you for training with HeroGYM.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid member prefix", () => {
    expect(gymSettingsSchema.safeParse({ ...base, memberCodePrefix: "TOOLONG" }).success).toBe(false);
    expect(gymSettingsSchema.safeParse({ ...base, memberCodePrefix: "A" }).success).toBe(false);
  });

  it("rejects unsafe logo protocols", () => {
    expect(gymSettingsSchema.safeParse({ ...base, logoUrl: "ftp://example.com/logo.png" }).success).toBe(
      false,
    );
  });

  it("keeps the reminder window within 1 to 30 days", () => {
    expect(gymSettingsSchema.safeParse({ ...base, reminderDays: 0 }).success).toBe(false);
    expect(gymSettingsSchema.safeParse({ ...base, reminderDays: 31 }).success).toBe(false);
    expect(gymSettingsSchema.safeParse({ ...base, reminderDays: 30 }).success).toBe(true);
  });
});

describe("ownerProfileSchema", () => {
  it("requires a usable display name", () => {
    expect(ownerProfileSchema.safeParse({ fullName: "A", phone: "" }).success).toBe(false);
    expect(ownerProfileSchema.safeParse({ fullName: "Aditya", phone: "" }).success).toBe(true);
  });
});
