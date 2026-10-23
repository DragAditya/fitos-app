import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-[#151519] ring-1 ring-black/[0.08] shadow-[0_8px_20px_-10px_rgba(18,18,22,.9)]",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(124,118,255,.55),transparent_52%)]" />
      <span className="absolute inset-0 noise opacity-[0.12]" />
      <svg
        viewBox="0 0 36 36"
        fill="none"
        className="relative h-[66%] w-[66%]"
        aria-hidden="true"
      >
        <path d="M10.5 9.5h14" stroke="#fffdf6" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M10.5 9.5v17.5" stroke="#fffdf6" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M10.5 18.2h9.2" stroke="#b9b3ff" strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="26.6" cy="26.9" r="2.15" fill="#8fe4c2" />
      </svg>
    </span>
  );
}

export function Brand({
  href = "/",
  showTagline = false,
  className,
  markClassName,
}: {
  href?: string;
  showTagline?: boolean;
  className?: string;
  markClassName?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="flex flex-col">
        <span className="text-[17px] font-semibold leading-none tracking-[-0.045em] text-ink">
          FitOS<span className="text-[#6a63ea]">.</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-soft">
            Gym operating system
          </span>
        ) : null}
      </span>
    </Link>
  );
}
