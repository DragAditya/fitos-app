"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, ScanLine, ShieldAlert } from "lucide-react";
import { selfCheckInAction, type SelfCheckInResult } from "@/server/actions/attendance";
import { Button } from "@/components/ui/button";

export function SelfCheckInButton({
  token,
  timezone,
}: {
  token: string;
  timezone: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<SelfCheckInResult | null>(null);
  const [error, setError] = React.useState<string>();

  async function checkIn() {
    setPending(true);
    setError(undefined);
    try {
      const outcome = await selfCheckInAction(token);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setResult(outcome.data);
    } catch {
      setError("Could not reach FitOS. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (result?.status === "success") {
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(result.time));

    return (
      <div className="rounded-[24px] border border-[#b9e6d2] bg-[linear-gradient(160deg,#effcf6_0%,#f8fffc_100%)] p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#d8f6e8] text-[#137956]">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.045em] text-[#103f2e]">You&apos;re in.</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3d7561]">
          {result.memberName} · checked in at {time}
          <br />
          {result.gymName}
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button asChild variant="primary">
            <Link href="/me/attendance">
              View my visits <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/me">Back home</Link>
          </Button>
        </div>
        <p className="mt-4 text-[9.5px] text-[#6b9c87]">One check-in per member per day. Have a good session.</p>
      </div>
    );
  }

  return (
    <div>
      {result?.status === "rejected" ? (
        <div className="mb-4 flex gap-2.5 rounded-[16px] border border-[#f0d2cd] bg-[#fff7f5] p-4">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#b3453d]" />
          <div>
            <p className="text-[12px] font-semibold text-[#7d2d27]">Check-in not recorded</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#9a5b55]">{result.message}</p>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-[14px] border border-[#f0d2cd] bg-[#fff7f5] px-3.5 py-3 text-[11px] leading-relaxed text-[#8c3d36]">
          {error}
        </div>
      ) : null}
      <Button
        type="button"
        variant="gradient"
        size="lg"
        className="w-full rounded-[14px] py-3.5 text-[13.5px]"
        onClick={() => void checkIn()}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ScanLine />}
        {pending ? "Checking you in…" : "Confirm check-in"}
      </Button>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-soft">
        Your gym membership and today&apos;s visits are checked before anything is saved.
      </p>
    </div>
  );
}
