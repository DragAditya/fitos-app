import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsSection({
  id,
  index,
  title,
  description,
  icon: Icon,
  children,
  className,
  headerAction,
}: {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-settings-section={id}
      className={cn(
        "scroll-mt-[88px] overflow-hidden rounded-[24px] border border-line bg-white shadow-[var(--shadow-soft)] animate-fade-up",
        className,
      )}
    >
      <div className="relative border-b border-line px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(91,92,226,.22),transparent)]" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-[13px] border border-[#dedcfb] bg-[linear-gradient(145deg,#f7f6ff,#eeeefe)] text-[#5551d4] shadow-[0_8px_18px_-14px_rgba(85,81,212,.8)]">
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-soft">
                {index}
              </p>
              <h2 className="mt-0.5 text-[16px] font-semibold tracking-[-0.025em] text-ink">{title}</h2>
              <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">{description}</p>
            </div>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
