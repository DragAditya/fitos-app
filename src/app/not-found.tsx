import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-[18px] border border-line bg-white text-muted shadow-sm">
          <Compass className="size-6" />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-soft">404</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-ink">We could not find that page</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          The link may be outdated, or the record may have been removed. Check the address and try again.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="gradient" size="md">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary" size="md">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
