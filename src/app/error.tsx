"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-[18px] border border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33] shadow-sm">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.04em] text-ink">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          An unexpected error interrupted this page. Your data is safe — retrying usually fixes it.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-[10.5px] text-soft">Reference: {error.digest}</p> : null}
        <div className="mt-6">
          <Button variant="gradient" size="md" onClick={reset}>
            <RefreshCw /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
