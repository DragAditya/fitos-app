import "server-only";

import type { ZodError } from "zod";
import type { ActionResult } from "@/types";

export function validationFailure(error: ZodError): ActionResult<never> {
  const flattened = error.flatten();
  const fieldErrors = Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1]),
    ),
  );
  return {
    ok: false,
    error: "Please check the highlighted fields and try again.",
    fieldErrors,
  };
}

export function failure(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  if (process.env.NODE_ENV !== "production") {
    console.error("[fitos-action]", error);
  }
  return { ok: false, error: message };
}
