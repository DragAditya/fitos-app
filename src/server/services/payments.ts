import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { splitPayment, type PaymentSplit } from "@/lib/payments";
import type { PaymentInput } from "@/lib/validation";
import { query, queryOne, transaction, type DbExecutor } from "@/server/db/client";
import type {
  MemberCreditEntry,
  Payment,
  PaymentMethod,
  PaymentQuote,
  PaymentRow,
  PaymentStatus,
} from "@/server/db/types";
import { writeAudit } from "@/server/audit";
import { getMemberById } from "./members";

const SELECT = /* sql */ `
  SELECT pay.*, p.full_name AS member_name, p.email AS member_email, gm.member_code,
         mp.name AS plan_name
  FROM payments pay
  JOIN gym_members gm ON gm.id = pay.member_id
  JOIN profiles p ON p.id = gm.profile_id
  LEFT JOIN memberships m ON m.id = pay.membership_id
  LEFT JOIN membership_plans mp ON mp.id = m.plan_id
`;

const ADVANCE_BALANCE = /* sql */ `
  SELECT COALESCE(SUM(amount_cents), 0)::int AS balance
  FROM member_credit_ledger
  WHERE gym_id = $1 AND member_id = $2
`;

export type PaymentFilters = {
  q?: string;
  status?: string;
  method?: string;
  memberId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listPayments(
  gymId: string,
  timezone: string,
  filters: PaymentFilters = {},
) {
  const values: unknown[] = [gymId];
  const conditions = ["pay.gym_id = $1"];
  // The timezone is only needed by date filters. Binding it unconditionally
  // leaves an unused $2, which PostgreSQL cannot type.
  let timezonePlaceholder: string | null = null;
  const timezoneParam = () => {
    if (!timezonePlaceholder) {
      values.push(timezone);
      timezonePlaceholder = `$${values.length}`;
    }
    return timezonePlaceholder;
  };
  if (filters.q?.trim()) {
    values.push(`%${filters.q.trim()}%`);
    const p = values.length;
    conditions.push(
      `(p.full_name ILIKE $${p} OR p.email ILIKE $${p} OR pay.receipt_number ILIKE $${p} OR COALESCE(pay.reference, '') ILIKE $${p})`,
    );
  }
  if (filters.status && ["paid", "pending", "failed", "refunded"].includes(filters.status)) {
    values.push(filters.status);
    conditions.push(`pay.status = $${values.length}`);
  }
  if (filters.method && ["cash", "upi", "bank_transfer", "card"].includes(filters.method)) {
    values.push(filters.method);
    conditions.push(`pay.method = $${values.length}`);
  }
  if (filters.memberId) {
    values.push(filters.memberId);
    conditions.push(`pay.member_id = $${values.length}`);
  }
  if (filters.from) {
    const tz = timezoneParam();
    values.push(filters.from);
    conditions.push(`(pay.paid_at AT TIME ZONE ${tz})::date >= $${values.length}`);
  }
  if (filters.to) {
    const tz = timezoneParam();
    values.push(filters.to);
    conditions.push(`(pay.paid_at AT TIME ZONE ${tz})::date <= $${values.length}`);
  }
  const where = conditions.join(" AND ");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 10));

  const [totalRow, summaryRow, rows] = await Promise.all([
    queryOne<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM payments pay
       JOIN gym_members gm ON gm.id = pay.member_id
       JOIN profiles p ON p.id = gm.profile_id
       WHERE ${where}`,
      values,
    ),
    queryOne<{
      collected: number;
      pending: number;
      failed: number;
      refunded: number;
      plan_applied: number;
      advance_added: number;
      credit_used: number;
    }>(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (WHERE pay.status = 'paid'), 0)::int AS collected,
         COALESCE(SUM(amount_cents) FILTER (WHERE pay.status = 'pending'), 0)::int AS pending,
         COALESCE(SUM(amount_cents) FILTER (WHERE pay.status = 'failed'), 0)::int AS failed,
         COALESCE(SUM(amount_cents) FILTER (WHERE pay.status = 'refunded'), 0)::int AS refunded,
         COALESCE(SUM(plan_applied_cents) FILTER (WHERE pay.status = 'paid'), 0)::int AS plan_applied,
         COALESCE(SUM(advance_added_cents) FILTER (WHERE pay.status = 'paid'), 0)::int AS advance_added,
         COALESCE(SUM(credit_used_cents) FILTER (WHERE pay.status = 'paid'), 0)::int AS credit_used
       FROM payments pay
       JOIN gym_members gm ON gm.id = pay.member_id
       JOIN profiles p ON p.id = gm.profile_id
       WHERE ${where}`,
      values,
    ),
    query<PaymentRow>(
      `${SELECT} WHERE ${where} ORDER BY pay.paid_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    ),
  ]);

  const total = totalRow?.total ?? 0;
  return {
    payments: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      collected: summaryRow?.collected ?? 0,
      pending: summaryRow?.pending ?? 0,
      failed: summaryRow?.failed ?? 0,
      refunded: summaryRow?.refunded ?? 0,
      planApplied: summaryRow?.plan_applied ?? 0,
      advanceAdded: summaryRow?.advance_added ?? 0,
      creditUsed: summaryRow?.credit_used ?? 0,
    },
  };
}

async function lockMember(tx: DbExecutor, gymId: string, memberId: string) {
  const member = await tx.query<{ id: string }>(
    "SELECT id FROM gym_members WHERE id = $1 AND gym_id = $2 FOR UPDATE",
    [memberId, gymId],
  );
  if (!member.rows[0]) throw new Error("Member not found in this gym.");
}

async function getAdvanceBalanceInTx(tx: DbExecutor, gymId: string, memberId: string) {
  const row = await tx.query<{ balance: number }>(ADVANCE_BALANCE, [gymId, memberId]);
  return row.rows[0]?.balance ?? 0;
}

async function getPaidToPlanInTx(
  tx: DbExecutor,
  gymId: string,
  membershipId: string,
  excludePaymentId?: string,
) {
  const row = await tx.query<{ paid: number }>(
    `SELECT COALESCE(SUM(plan_applied_cents + credit_used_cents), 0)::int AS paid
     FROM payments
     WHERE gym_id = $1 AND membership_id = $2 AND status = 'paid'
       AND ($3::text IS NULL OR id <> $3)`,
    [gymId, membershipId, excludePaymentId ?? null],
  );
  return row.rows[0]?.paid ?? 0;
}

async function lockMembership(
  tx: DbExecutor,
  gymId: string,
  memberId: string,
  membershipId: string,
) {
  const row = await tx.query<{
    id: string;
    price_cents: number;
    plan_name: string;
    currency: string;
  }>(
    `SELECT m.id, m.price_cents, mp.name AS plan_name, g.currency
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     JOIN gyms g ON g.id = m.gym_id
     WHERE m.id = $1 AND m.gym_id = $2 AND m.member_id = $3
     FOR UPDATE OF m`,
    [membershipId, gymId, memberId],
  );
  const membership = row.rows[0];
  if (!membership) throw new Error("That membership does not belong to this member.");
  return membership;
}

type Split = PaymentSplit;

async function calculateSplit(input: {
  tx: DbExecutor;
  gymId: string;
  memberId: string;
  membershipId: string | null;
  amountCents: number;
  paid: boolean;
}): Promise<Split & { dueCents: number; advanceCents: number }> {
  if (!input.membershipId) {
    return {
      planAppliedCents: 0,
      advanceAddedCents: input.amountCents,
      creditUsedCents: 0,
      dueCents: 0,
      advanceCents: 0,
    };
  }

  const membership = await lockMembership(
    input.tx,
    input.gymId,
    input.memberId,
    input.membershipId,
  );
  const paidCents = await getPaidToPlanInTx(input.tx, input.gymId, input.membershipId);
  const dueCents = Math.max(0, membership.price_cents - paidCents);
  const advanceCents = await getAdvanceBalanceInTx(input.tx, input.gymId, input.memberId);

  return {
    ...splitPayment({
      amountCents: input.amountCents,
      dueCents,
      advanceCents,
      paid: input.paid,
    }),
    dueCents,
    advanceCents,
  };
}

async function insertCreditEntries(
  tx: DbExecutor,
  input: {
    gymId: string;
    memberId: string;
    paymentId: string;
    membershipId: string | null;
    split: Split;
    note: string;
  },
) {
  if (input.split.creditUsedCents > 0) {
    await tx.query(
      `INSERT INTO member_credit_ledger
        (id, gym_id, member_id, payment_id, membership_id, amount_cents, kind, note)
       VALUES ($1, $2, $3, $4, $5, $6, 'advance_applied', $7)`,
      [
        randomUUID(),
        input.gymId,
        input.memberId,
        input.paymentId,
        input.membershipId,
        -input.split.creditUsedCents,
        input.note,
      ],
    );
  }
  if (input.split.advanceAddedCents > 0) {
    await tx.query(
      `INSERT INTO member_credit_ledger
        (id, gym_id, member_id, payment_id, membership_id, amount_cents, kind, note)
       VALUES ($1, $2, $3, $4, $5, $6, 'advance_received', $7)`,
      [
        randomUUID(),
        input.gymId,
        input.memberId,
        input.paymentId,
        input.membershipId,
        input.split.advanceAddedCents,
        input.note,
      ],
    );
  }
}

export async function recordPayment(input: {
  gymId: string;
  actorId: string;
  timezone: string;
  data: PaymentInput;
}) {
  const member = await getMemberById(input.gymId, input.data.memberId);
  if (!member) throw new Error("Member not found in this gym.");

  const amountCents = Math.round(input.data.amount * 100);
  if (amountCents < 0) throw new Error("Amount cannot be negative.");

  const result = await transaction(async (tx) => {
    await lockMember(tx, input.gymId, input.data.memberId);

    let membershipId: string | null = null;
    if (input.data.membershipId) {
      const membership = await lockMembership(
        tx,
        input.gymId,
        input.data.memberId,
        input.data.membershipId,
      );
      membershipId = membership.id;
    }

    const split = await calculateSplit({
      tx,
      gymId: input.gymId,
      memberId: input.data.memberId,
      membershipId,
      amountCents,
      paid: input.data.status === "paid",
    });

    const id = randomUUID();
    const receipt = `FIT-${input.data.paidAt.slice(0, 4)}-${randomBytes(3).toString("hex").toUpperCase()}`;

    await tx.query(
      `INSERT INTO payments
        (id, gym_id, member_id, membership_id, receipt_number, amount_cents,
         plan_applied_cents, advance_added_cents, credit_used_cents, currency,
         method, status, reference, notes, paid_at, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'INR', $10, $11, $12, $13,
         ($14::date + time '12:00') AT TIME ZONE $15, $16)`,
      [
        id,
        input.gymId,
        input.data.memberId,
        membershipId,
        receipt,
        amountCents,
        split.planAppliedCents,
        split.advanceAddedCents,
        split.creditUsedCents,
        input.data.method,
        input.data.status,
        input.data.reference?.trim() || null,
        input.data.notes?.trim() || null,
        input.data.paidAt,
        input.timezone,
        input.actorId,
      ],
    );

    if (input.data.status === "paid") {
      await insertCreditEntries(tx, {
        gymId: input.gymId,
        memberId: input.data.memberId,
        paymentId: id,
        membershipId,
        split,
        note: `Payment ${receipt}`,
      });
    }

    return { id, receipt, split };
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: "payment.recorded",
    entityType: "payment",
    entityId: result.id,
    metadata: {
      memberId: input.data.memberId,
      amountCents,
      planAppliedCents: result.split.planAppliedCents,
      advanceAddedCents: result.split.advanceAddedCents,
      creditUsedCents: result.split.creditUsedCents,
      method: input.data.method,
      status: input.data.status,
      gatewayVerified: false,
    },
  });
  return { id: result.id, receipt: result.receipt };
}

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  paid: ["refunded", "failed"],
  pending: ["paid", "failed"],
  failed: ["paid", "pending"],
  refunded: [],
};

async function settlePayment(tx: DbExecutor, payment: Payment) {
  const split = await calculateSplit({
    tx,
    gymId: payment.gym_id,
    memberId: payment.member_id,
    membershipId: payment.membership_id,
    amountCents: payment.amount_cents,
    paid: true,
  });

  await tx.query(
    `UPDATE payments
     SET plan_applied_cents = $1, advance_added_cents = $2, credit_used_cents = $3
     WHERE id = $4 AND gym_id = $5`,
    [
      split.planAppliedCents,
      split.advanceAddedCents,
      split.creditUsedCents,
      payment.id,
      payment.gym_id,
    ],
  );

  await insertCreditEntries(tx, {
    gymId: payment.gym_id,
    memberId: payment.member_id,
    paymentId: payment.id,
    membershipId: payment.membership_id,
    split,
    note: `Payment ${payment.receipt_number} settled`,
  });
}

async function reversePaymentEffects(tx: DbExecutor, payment: Payment) {
  if (payment.status !== "paid") return;

  if (payment.advance_added_cents > 0) {
    const balance = await getAdvanceBalanceInTx(tx, payment.gym_id, payment.member_id);
    if (balance < payment.advance_added_cents) {
      throw new Error(
        "This payment created advance credit that has already been used. Adjust the next payment instead of reversing this one.",
      );
    }
    await tx.query(
      `INSERT INTO member_credit_ledger
        (id, gym_id, member_id, payment_id, membership_id, amount_cents, kind, note)
       VALUES ($1, $2, $3, $4, $5, $6, 'advance_refunded', $7)`,
      [
        randomUUID(),
        payment.gym_id,
        payment.member_id,
        payment.id,
        payment.membership_id,
        -payment.advance_added_cents,
        `Payment ${payment.receipt_number} reversed`,
      ],
    );
  }

  if (payment.credit_used_cents > 0) {
    await tx.query(
      `INSERT INTO member_credit_ledger
        (id, gym_id, member_id, payment_id, membership_id, amount_cents, kind, note)
       VALUES ($1, $2, $3, $4, $5, $6, 'advance_restored', $7)`,
      [
        randomUUID(),
        payment.gym_id,
        payment.member_id,
        payment.id,
        payment.membership_id,
        payment.credit_used_cents,
        `Payment ${payment.receipt_number} reversed`,
      ],
    );
  }
}

export async function updatePaymentStatus(input: {
  gymId: string;
  actorId: string;
  paymentId: string;
  status: PaymentStatus;
}) {
  const result = await transaction(async (tx) => {
    const row = await tx.query<Payment>(
      "SELECT * FROM payments WHERE gym_id = $1 AND id = $2 FOR UPDATE",
      [input.gymId, input.paymentId],
    );
    const payment = row.rows[0];
    if (!payment) throw new Error("Payment not found.");
    if (!TRANSITIONS[payment.status].includes(input.status)) {
      throw new Error(`A ${payment.status} payment cannot be marked ${input.status}.`);
    }

    // Serialize every credit movement for this member, including refunds and
    // settlements. Without this, a refund can race a new payment and drive the
    // advance ledger negative.
    await lockMember(tx, payment.gym_id, payment.member_id);

    if (payment.status !== "paid" && input.status === "paid") {
      await settlePayment(tx, payment);
    } else if (payment.status === "paid" && input.status !== "paid") {
      await reversePaymentEffects(tx, payment);
    }

    await tx.query(
      `UPDATE payments SET status = $1,
         refunded_at = CASE WHEN $1 = 'refunded' THEN now() ELSE refunded_at END
       WHERE id = $2 AND gym_id = $3`,
      [input.status, input.paymentId, input.gymId],
    );
    return { previousStatus: payment.status };
  });

  await writeAudit({
    gymId: input.gymId,
    actorId: input.actorId,
    action: `payment.${input.status}`,
    entityType: "payment",
    entityId: input.paymentId,
    metadata: { previousStatus: result.previousStatus },
  });
}

export async function getPaymentDetails(paymentId: string) {
  return queryOne<
    PaymentRow & {
      gym_name: string;
      gym_address: string | null;
      gym_city: string | null;
      gym_phone: string | null;
      gym_email: string | null;
      gym_timezone: string;
      gym_logo_url: string | null;
      gym_receipt_footer: string | null;
      membership_start: string | null;
      membership_end: string | null;
      duration_label: string | null;
    }
  >(
    `SELECT pay.*, p.full_name AS member_name, p.email AS member_email, gm.member_code,
            mp.name AS plan_name, g.name AS gym_name, g.address AS gym_address,
            g.city AS gym_city, g.phone AS gym_phone, g.email AS gym_email,
            g.timezone AS gym_timezone, g.logo_url AS gym_logo_url,
            g.receipt_footer AS gym_receipt_footer, m.start_date AS membership_start,
            m.end_date AS membership_end, mp.duration_label
     FROM payments pay
     JOIN gym_members gm ON gm.id = pay.member_id
     JOIN profiles p ON p.id = gm.profile_id
     JOIN gyms g ON g.id = pay.gym_id
     LEFT JOIN memberships m ON m.id = pay.membership_id
     LEFT JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE pay.id = $1`,
    [paymentId],
  );
}

export async function getMemberPayments(gymId: string, memberId: string) {
  return query<PaymentRow>(
    `${SELECT} WHERE pay.gym_id = $1 AND pay.member_id = $2 ORDER BY pay.paid_at DESC`,
    [gymId, memberId],
  );
}

export async function getMemberAdvanceBalance(gymId: string, memberId: string) {
  const row = await queryOne<{ balance: number }>(ADVANCE_BALANCE, [gymId, memberId]);
  return row?.balance ?? 0;
}

export async function getMemberCreditLedger(gymId: string, memberId: string) {
  return query<MemberCreditEntry>(
    `SELECT * FROM member_credit_ledger
     WHERE gym_id = $1 AND member_id = $2
     ORDER BY created_at DESC`,
    [gymId, memberId],
  );
}

export async function getMembershipBalance(gymId: string, membershipId: string) {
  const row = await queryOne<{ price_cents: number; paid_cents: number }>(
    `SELECT m.price_cents,
            COALESCE((
              SELECT SUM(p.plan_applied_cents + p.credit_used_cents)::int
              FROM payments p
              WHERE p.gym_id = m.gym_id AND p.membership_id = m.id AND p.status = 'paid'
            ), 0)::int AS paid_cents
     FROM memberships m
     WHERE m.gym_id = $1 AND m.id = $2`,
    [gymId, membershipId],
  );
  if (!row) return null;
  return {
    priceCents: row.price_cents,
    paidCents: row.paid_cents,
    dueCents: Math.max(0, row.price_cents - row.paid_cents),
  };
}

export async function getPaymentQuote(input: {
  gymId: string;
  memberId: string;
  membershipId: string;
}): Promise<PaymentQuote> {
  const row = await queryOne<{
    id: string;
    member_id: string;
    plan_name: string;
    currency: string;
    price_cents: number;
    paid_cents: number;
  }>(
    `SELECT m.id, m.member_id, mp.name AS plan_name, g.currency, m.price_cents,
            COALESCE((
              SELECT SUM(p.plan_applied_cents + p.credit_used_cents)::int
              FROM payments p
              WHERE p.gym_id = m.gym_id AND p.membership_id = m.id AND p.status = 'paid'
            ), 0)::int AS paid_cents
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     JOIN gyms g ON g.id = m.gym_id
     WHERE m.gym_id = $1 AND m.member_id = $2 AND m.id = $3`,
    [input.gymId, input.memberId, input.membershipId],
  );
  if (!row) throw new Error("That membership does not belong to this member.");

  const dueCents = Math.max(0, row.price_cents - row.paid_cents);
  const advanceCents = await getMemberAdvanceBalance(input.gymId, input.memberId);
  const creditToApplyCents = Math.min(Math.max(0, advanceCents), dueCents);

  return {
    membershipId: row.id,
    memberId: row.member_id,
    planName: row.plan_name,
    currency: row.currency,
    priceCents: row.price_cents,
    paidCents: row.paid_cents,
    dueCents,
    advanceCents,
    creditToApplyCents,
    cashNeededCents: dueCents - creditToApplyCents,
  };
}

export async function getMemberPaymentSummary(gymId: string, memberId: string) {
  const [row, advance, planDueRow] = await Promise.all([
    queryOne<{
      paid: number;
      pending: number;
      failed: number;
      refunded: number;
      count: number;
    }>(
      `SELECT
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0)::int AS paid,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::int AS pending,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'failed'), 0)::int AS failed,
         COALESCE(SUM(amount_cents) FILTER (WHERE status = 'refunded'), 0)::int AS refunded,
         COUNT(*)::int AS count
       FROM payments WHERE gym_id = $1 AND member_id = $2`,
      [gymId, memberId],
    ),
    getMemberAdvanceBalance(gymId, memberId),
    queryOne<{ due: number }>(
      `SELECT COALESCE(SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0)), 0)::int AS due
       FROM memberships m
       LEFT JOIN (
         SELECT membership_id, SUM(plan_applied_cents + credit_used_cents)::int AS total
         FROM payments
         WHERE gym_id = $1 AND member_id = $2 AND status = 'paid' AND membership_id IS NOT NULL
         GROUP BY membership_id
       ) paid ON paid.membership_id = m.id
       WHERE m.gym_id = $1 AND m.member_id = $2 AND m.status IN ('active', 'pending')`,
      [gymId, memberId],
    ),
  ]);

  return {
    paid: row?.paid ?? 0,
    pending: row?.pending ?? 0,
    failed: row?.failed ?? 0,
    refunded: row?.refunded ?? 0,
    advance,
    outstanding: planDueRow?.due ?? 0,
    count: row?.count ?? 0,
  };
}

export async function getMembershipPaymentOptions(gymId: string, memberId?: string) {
  return query<{
    id: string;
    member_id: string;
    plan_name: string;
    price_cents: number;
    paid_cents: number;
    due_cents: number;
    start_date: string;
    end_date: string;
    status: string;
  }>(
    `SELECT m.id, m.member_id, mp.name AS plan_name, m.price_cents,
            COALESCE((
              SELECT SUM(p.plan_applied_cents + p.credit_used_cents)::int
              FROM payments p
              WHERE p.gym_id = m.gym_id AND p.membership_id = m.id AND p.status = 'paid'
            ), 0)::int AS paid_cents,
            GREATEST(m.price_cents - COALESCE((
              SELECT SUM(p.plan_applied_cents + p.credit_used_cents)::int
              FROM payments p
              WHERE p.gym_id = m.gym_id AND p.membership_id = m.id AND p.status = 'paid'
            ), 0), 0)::int AS due_cents,
            m.start_date, m.end_date, m.status
     FROM memberships m JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE m.gym_id = $1 ${memberId ? "AND m.member_id = $2" : ""}
       AND m.status IN ('active', 'pending')
     ORDER BY m.created_at DESC`,
    memberId ? [gymId, memberId] : [gymId],
  );
}

export async function getOutstandingMembers(gymId: string, _timezone: string) {
  return query<{
    member_id: string;
    member_name: string;
    email: string;
    member_code: string;
    amount: number;
    oldest: string;
  }>(
    `SELECT m.member_id, p.full_name AS member_name, p.email, gm.member_code,
            SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0))::int AS amount,
            MIN(m.start_date)::text AS oldest
     FROM memberships m
     JOIN gym_members gm ON gm.id = m.member_id
     JOIN profiles p ON p.id = gm.profile_id
     LEFT JOIN (
       SELECT membership_id, SUM(plan_applied_cents + credit_used_cents)::int AS total
       FROM payments
       WHERE gym_id = $1 AND status = 'paid' AND membership_id IS NOT NULL
       GROUP BY membership_id
     ) paid ON paid.membership_id = m.id
     WHERE m.gym_id = $1 AND m.status IN ('active', 'pending')
     GROUP BY m.member_id, p.full_name, p.email, gm.member_code
     HAVING SUM(GREATEST(m.price_cents - COALESCE(paid.total, 0), 0)) > 0
     ORDER BY amount DESC`,
    [gymId],
  );
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};
