export type PaymentSplit = {
  planAppliedCents: number;
  advanceAddedCents: number;
  creditUsedCents: number;
};

/**
 * Splits cash received into plan settlement and advance credit.
 *
 * A payment can never apply more than the plan's remaining balance. If the
 * member already holds advance credit, it is consumed first; any cash left
 * after the plan is settled becomes new advance credit for the next plan.
 */
export function splitPayment(input: {
  amountCents: number;
  dueCents: number;
  advanceCents: number;
  paid: boolean;
}): PaymentSplit {
  const amountCents = Math.max(0, Math.round(input.amountCents));
  const dueCents = Math.max(0, Math.round(input.dueCents));
  const advanceCents = Math.max(0, Math.round(input.advanceCents));

  if (!input.paid) {
    const planAppliedCents = Math.min(amountCents, dueCents);
    return {
      planAppliedCents,
      advanceAddedCents: amountCents - planAppliedCents,
      creditUsedCents: 0,
    };
  }

  const creditUsedCents = Math.min(advanceCents, dueCents);
  const remainingDueCents = dueCents - creditUsedCents;
  const planAppliedCents = Math.min(amountCents, remainingDueCents);

  return {
    planAppliedCents,
    advanceAddedCents: amountCents - planAppliedCents,
    creditUsedCents,
  };
}
