"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OwnerError({
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
    <div className="mx-auto max-w-xl py-16">
      <Card className="p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-[16px] border border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33]">
          <TriangleAlert className="size-5" />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">This page hit a snag</h1>
        <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
          The dashboard could not load its data. Nothing was changed — try loading it again.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-[10.5px] text-soft">Reference: {error.digest}</p> : null}
        <div className="mt-5 flex justify-center">
          <Button variant="gradient" size="sm" onClick={reset}>
            <RefreshCw /> Reload
          </Button>
        </div>
      </Card>
    </div>
  );
}
