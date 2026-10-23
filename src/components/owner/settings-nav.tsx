"use client";

import * as React from "react";
import {
  Building2,
  Database,
  Globe2,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Gym profile", hint: "Identity & branding", icon: Building2 },
  { id: "regional", label: "Regional", hint: "Timezone & currency", icon: Globe2 },
  { id: "checkin", label: "Check-in rules", hint: "Access & reminders", icon: ScanLine },
  { id: "receipts", label: "Receipts", hint: "Notes & footers", icon: ReceiptText },
  { id: "account", label: "Owner account", hint: "Profile & security", icon: ShieldCheck },
  { id: "data", label: "Data & exports", hint: "Backups & CSV", icon: Database },
] as const;

export function SettingsNav() {
  const [active, setActive] = React.useState<string>(SECTIONS[0].id);

  React.useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-16% 0px -68% 0px", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    setActive(id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <aside className="min-w-0 xl:sticky xl:top-[88px] xl:self-start">
      <div className="rounded-[20px] border border-line bg-white/85 p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-center gap-2 px-2.5 pb-2 pt-1.5">
          <Sparkles className="size-3 text-[#7c77ea]" />
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-soft">Workspace map</p>
        </div>
        <nav
          aria-label="Settings sections"
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:block xl:space-y-1"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => goTo(section.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative flex w-full min-w-0 items-center gap-2.5 rounded-[13px] px-2.5 py-2.5 text-left transition-all duration-300 sm:px-3",
                  isActive
                    ? "bg-[#f3f2ff] text-ink shadow-[inset_0_0_0_1px_rgba(222,220,251,.8)]"
                    : "text-muted hover:bg-[#fafaf7] hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-[9px] transition-all duration-300",
                    isActive
                      ? "bg-white text-[#5551d4] shadow-[0_3px_10px_-5px_rgba(85,81,212,.5)]"
                      : "bg-[#f7f7f3] text-soft group-hover:text-muted",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold tracking-[-0.01em]">
                    {section.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 hidden truncate text-[9.5px] transition-colors xl:block",
                      isActive ? "text-[#7772d8]" : "text-soft",
                    )}
                  >
                    {section.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden size-1.5 rounded-full transition-all duration-300 xl:block",
                    isActive ? "bg-[#6f69e8] shadow-[0_0_0_4px_rgba(111,105,232,.12)]" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-3 hidden overflow-hidden rounded-[18px] border border-line bg-[linear-gradient(160deg,#fbfbf8_0%,#f5f4ee_100%)] p-4 xl:block">
        <span className="grid size-8 place-items-center rounded-[10px] border border-[#dedcfb] bg-white text-[#5551d4]">
          <ShieldCheck className="size-4" />
        </span>
        <p className="mt-3 text-[11.5px] font-semibold tracking-[-0.01em]">Server-enforced settings</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          Every switch is checked again on the server. Nothing here is a decorative toggle.
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[9.5px] font-medium text-[#6b66cf]">
          <span className="size-1.5 rounded-full bg-[#8b86ef]" />
          Audited changes
        </div>
      </div>
    </aside>
  );
}
