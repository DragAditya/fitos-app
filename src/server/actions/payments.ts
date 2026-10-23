"use server";

import { revalidatePath } from "next/cache";
import { paymentSchema, type PaymentInput } from "@/lib/validation";
import type { PaymentStatus } from "@/server/db/types";
import type { ActionResult } from "@/types";
import { requireOwner } from "@/server/auth/session";
import { getPaymentQuote, recordPayment, updatePaymentStatus } from "@/server/services/payments";
import type { PaymentQuote } from "@/server/db/types";
import { failure, validationFailure } from "./helpers";

export async function getPaymentQuoteAction(
  memberId: string,
  membershipId: string,
): Promise<ActionResult<PaymentQuote>> {
  const auth = await requireOwner();
  if (!memberId || !membershipId) return { ok: false, error: "Choose a member and membership." };
  try {
    const quote = await getPaymentQuote({
      gymId: auth.gym.id,
      memberId,
      membershipId,
    });
    return { ok: true, message: "", data: quote };
  } catch (error) {
    return failure(error);
  }
}

export async function recordPaymentAction(
  input: PaymentInput,
): Promise<ActionResult<{ paymentId: string; receipt: string }>> {
  const auth = await requireOwner();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await recordPayment({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      timezone: auth.gym.timezone,
      data: parsed.data,
    });
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath(`/members/${parsed.data.memberId}`);
    revalidatePath("/me/payments");
    revalidatePath("/reports");
    return {
      ok: true,
      message: `Payment recorded. Receipt ${result.receipt}.`,
      data: { paymentId: result.id, receipt: result.receipt },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updatePaymentStatusAction(
  paymentId: string,
  status: PaymentStatus,
): Promise<ActionResult<undefined>> {
  const auth = await requireOwner();
  try {
    await updatePaymentStatus({
      gymId: auth.gym.id,
      actorId: auth.profile.id,
      paymentId,
      status,
    });
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/me/payments");
    return { ok: true, message: `Payment marked ${status}.`, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
