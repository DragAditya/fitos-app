import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  CreditCard,
  Database,
  Download,
  FileSpreadsheet,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
import { SettingsSection } from "@/components/owner/settings-section";

const EXPORTS: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  filename: string;
}> = [
  {
    title: "Members",
    description: "Contact details, status and member codes.",
    href: "/api/export/members",
    icon: UsersRound,
    filename: "members.csv",
  },
  {
    title: "Memberships",
    description: "Plan history, dates and membership status.",
    href: "/api/export/memberships",
    icon: CreditCard,
    filename: "memberships.csv",
  },
  {
    title: "Payments",
    description: "Receipts, methods, status and advance credit.",
    href: "/api/export/payments",
    icon: ReceiptText,
    filename: "payments.csv",
  },
  {
    title: "Attendance",
    description: "Daily visits with QR or manual method.",
    href: "/api/export/attendance",
    icon: CalendarCheck,
    filename: "attendance.csv",
  },
  {
    title: "Plans",
    description: "The membership catalogue and pricing.",
    href: "/api/export/plans",
    icon: FileSpreadsheet,
    filename: "plans.csv",
  },
];

export function DataSettings({
  gym,
  driver,
  demoSeed,
}: {
  gym: { id: string; slug: string };
  driver: "pglite" | "postgres";
  demoSeed: boolean;
}) {
  return (
    <SettingsSection
      id="data"
      index="06 · Data"
      icon={Database}
      title="Data & exports"
      description="Take your workspace with you. Every export is scoped to this gym and generated on the server."
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {EXPORTS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              download={item.filename}
              className="group relative flex items-start gap-3 overflow-hidden rounded-[16px] border border-line bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8d6f7] hover:shadow-[0_16px_36px_-26px_rgba(85,81,212,.45)]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fbfbf8] text-muted transition-colors group-hover:border-[#dedcfb] group-hover:bg-[#f5f4ff] group-hover:text-[#5551d4]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-semibold">{item.title}</span>
                  <span className="rounded-full border border-line bg-[#fafaf7] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-soft">
                    CSV
                  </span>
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{item.description}</span>
              </span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 translate-x-1 text-[#7772d8] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                <Download className="size-3.5" />
              </span>
            </a>
          );
        })}
        <Link
          href="/reports"
          className="group flex items-center gap-3 rounded-[16px] border border-dashed border-[#d8d6f7] bg-[#fbfaff] p-3.5 transition-colors hover:bg-[#f6f5ff]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-[#dedcfb] bg-white text-[#5551d4]">
            <ArrowUpRight className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] font-semibold">Open reports</span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
              Revenue, attendance and member analytics with date filters.
            </span>
          </span>
        </Link>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-[13px] border border-line px-3.5 py-3">
          <span className="text-[10.5px] text-muted">Storage</span>
          <Badge variant="active">{driver === "postgres" ? "Managed PostgreSQL" : "Embedded PGlite"}</Badge>
        </div>
        <div className="flex items-center justify-between rounded-[13px] border border-line px-3.5 py-3">
          <span className="text-[10.5px] text-muted">Demo seed</span>
          <Badge variant={demoSeed ? "pending" : "active"}>{demoSeed ? "Enabled" : "Disabled"}</Badge>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[13px] border border-line px-3.5 py-3">
          <span className="text-[10.5px] text-muted">Workspace slug</span>
          <span className="truncate font-mono text-[10px] text-ink">{gym.slug}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[13px] border border-line px-3.5 py-3">
          <span className="text-[10.5px] text-muted">Gym ID</span>
          <span className="max-w-[170px] truncate font-mono text-[9px] text-soft">{gym.id}</span>
        </div>
      </div>

      <Alert variant="warning" className="mt-4">
        {driver === "postgres"
          ? "This workspace uses a managed database. Use your provider's backups and restore tools before large changes."
          : "Embedded PGlite data lives in .data/fitos. Back up that directory before resetting or moving the workspace."}{" "}
        Exports are a snapshot, not a full database backup.
      </Alert>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[10px] text-muted">
          Looking for a quick health check? The endpoint reports database connectivity and runtime mode.
        </p>
        <Link
          href="/api/health"
          className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#5652c8] transition-colors hover:text-[#3f3bb7]"
        >
          View health endpoint <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </SettingsSection>
  );
}
