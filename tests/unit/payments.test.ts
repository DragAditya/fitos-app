import { describe, expect, it } from "vitest";
import { splitPayment } from "@/lib/payments";

describe("splitPayment", () => {
  it("applies cash to the plan and stops at the balance", () => {
    expect(
      splitPayment({ amountCents: 250_000, dueCents: 250_000, advanceCents: 0, paid: true }),
    ).toEqual({ planAppliedCents: 250_000, advanceAddedCents: 0, creditUsedCents: 0 });

    expect(
      splitPayment({ amountCents: 300_000, dueCents: 250_000, advanceCents: 0, paid: true }),
    ).toEqual({ planAppliedCents: 250_000, advanceAddedCents: 50_000, creditUsedCents: 0 });
  });

  it("uses existing advance before cash and never applies more than the plan balance", () => {
    expect(
      splitPayment({ amountCents: 50_000, dueCents: 100_000, advanceCents: 30_000, paid: true }),
    ).toEqual({ planAppliedCents: 50_000, advanceAddedCents: 0, creditUsedCents: 30_000 });

    expect(
      splitPayment({ amountCents: 100_000, dueCents: 100_000, advanceCents: 30_000, paid: true }),
    ).toEqual({ planAppliedCents: 70_000, advanceAddedCents: 30_000, creditUsedCents: 30_000 });
  });

  it("lets advance fully settle a plan without creating cash credit", () => {
    expect(
      splitPayment({ amountCents: 0, dueCents: 100_000, advanceCents: 100_000, paid: true }),
    ).toEqual({ planAppliedCents: 0, advanceAddedCents: 0, creditUsedCents: 100_000 });
  });

  it("holds all cash as advance when the plan is already settled", () => {
    expect(
      splitPayment({ amountCents: 50_000, dueCents: 0, advanceCents: 0, paid: true }),
    ).toEqual({ planAppliedCents: 0, advanceAddedCents: 50_000, creditUsedCents: 0 });
  });

  it("does not apply advance to a pending payment", () => {
    expect(
      splitPayment({ amountCents: 50_000, dueCents: 100_000, advanceCents: 30_000, paid: false }),
    ).toEqual({ planAppliedCents: 50_000, advanceAddedCents: 0, creditUsedCents: 0 });
  });

  it("always accounts for every rupee received", () => {
    const cases = [
      { amountCents: 1, dueCents: 999, advanceCents: 0 },
      { amountCents: 999, dueCents: 1, advanceCents: 500 },
      { amountCents: 400, dueCents: 0, advanceCents: 0 },
      { amountCents: 1200, dueCents: 1000, advanceCents: 700 },
    ];
    for (const input of cases) {
      const split = splitPayment({ ...input, paid: true });
      expect(split.planAppliedCents + split.advanceAddedCents).toBe(input.amountCents);
      expect(split.planAppliedCents + split.creditUsedCents).toBeLessThanOrEqual(input.dueCents);
    }
  });
});
