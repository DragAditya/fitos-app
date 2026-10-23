import Link from "next/link";
import { CircleAlert, MoveLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export default function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f6f3] px-5">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Brand showTagline />
        </div>
        <div className="rounded-[24px] border border-line bg-white p-8 shadow-[var(--shadow-soft)]">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-[#f0dcd9] bg-[#fff5f3] text-danger">
            <CircleAlert className="size-5" />
          </div>
          <h1 className="mt-5 text-[23px] font-semibold tracking-[-0.04em]">This area isn’t yours</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            FitOS has exactly two roles, owner and member. This page belongs to the other one.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-ink px-4 text-[12.5px] font-medium text-white"
            >
              Owner dashboard
            </Link>
            <Link
              href="/me"
              className="inline-flex h-10 items-center gap-2 rounded-[11px] border border-line bg-white px-4 text-[12.5px] font-medium text-ink"
            >
              Member home
            </Link>
          </div>
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-[11.5px] text-muted hover:text-ink">
          <MoveLeft className="size-3" /> Back to FitOS
        </Link>
      </div>
    </div>
  );
}
