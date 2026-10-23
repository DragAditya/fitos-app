"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MemberError({
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
    <Card className="p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-[16px] border border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33]">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.03em]">Could not load this screen</h1>
      <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-muted">
        Check your connection and try again — your check-ins and payments are unaffected.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-[10px] text-soft">Reference: {error.digest}</p> : null}
      <div className="mt-5 flex justify-center">
        <Button variant="gradient" size="sm" onClick={reset}>
          <RefreshCw /> Retry
        </Button>
      </div>
    </Card>
  );
}
