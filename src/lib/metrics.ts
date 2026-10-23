/**
 * Revenue policy:
 * - Only `paid` payments count toward revenue.
 * - Refunded payments are excluded entirely (not netted separately), so a refund
 *   that was previously paid removes that payment from the selected period.
 * - Pending and failed payments are never revenue.
 */
export const REVENUE_STATUSES = ["paid"] as const;

export function isRevenuePayment(status: string): boolean {
  return status === "paid";
}

export function sumRevenue(payments: Array<{ amountCents: number; status: string }>): number {
  return payments.reduce(
    (total, payment) => (isRevenuePayment(payment.status) ? total + payment.amountCents : total),
    0,
  );
}

export function outstandingAmount(
  payments: Array<{ amountCents: number; status: string }>,
): number {
  return payments.reduce(
    (total, payment) =>
      payment.status === "pending" || payment.status === "failed"
        ? total + payment.amountCents
        : total,
    0,
  );
}

export type TrendPoint = {
  date: string;
  value: number;
};

export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function attendanceRate(checkIns: number, activeMembers: number, days: number): number {
  if (activeMembers <= 0 || days <= 0) return 0;
  return Math.round((checkIns / (activeMembers * days)) * 1000) / 10;
}
