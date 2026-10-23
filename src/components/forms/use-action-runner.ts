"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/types";

export function useActionRunner() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run<T>(
    action: () => Promise<ActionResult<T>>,
    options: {
      successMessage?: string | ((data: T) => string);
      onSuccess?: (data: T) => void;
      refresh?: boolean;
      errorMessage?: string;
    } = {},
  ): Promise<ActionResult<T> | null> {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error || options.errorMessage || "Something went wrong.");
        return result;
      }
      const message =
        typeof options.successMessage === "function"
          ? options.successMessage(result.data)
          : options.successMessage ?? result.message;
      if (message) toast.success(message);
      options.onSuccess?.(result.data);
      if (options.refresh !== false) router.refresh();
      return result;
    } catch (error) {
      console.error(error);
      toast.error(options.errorMessage ?? "Unable to complete that action. Please try again.");
      return null;
    } finally {
      setPending(false);
    }
  }

  return { run, pending };
}
