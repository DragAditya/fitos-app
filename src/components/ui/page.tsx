import * as React from "react";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-soft">{eyebrow}</p>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  trend?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-medium text-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-[10px] border border-line bg-[#fafaf7] text-[#68686f] [&_svg]:size-3.5">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-[27px] font-semibold leading-none tracking-[-0.045em] text-ink tabular">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {typeof trend === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10.5px] font-semibold",
              trend >= 0 ? "text-positive" : "text-danger",
            )}
          >
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
        {hint ? <span className="text-[10.5px] text-soft">{hint}</span> : null}
      </div>
    </div>
  );
}

export function InlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-[11.5px] font-medium text-[#5652c8] transition-colors hover:text-[#403bb0]",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3" />
    </a>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  function pageHref(target: number) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== "page") query.set(key, value);
    });
    query.set("page", String(target));
    return `${basePath}?${query.toString()}`;
  }
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <p className="text-[11px] text-soft">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-1">
        <a
          aria-disabled={page <= 1}
          href={page <= 1 ? undefined : pageHref(page - 1)}
          className={cn(
            "grid h-8 items-center rounded-[9px] border border-line bg-white px-3 text-[11px] font-medium text-muted transition-colors hover:text-ink",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          Previous
        </a>
        <a
          aria-disabled={page >= totalPages}
          href={page >= totalPages ? undefined : pageHref(page + 1)}
          className={cn(
            "grid h-8 items-center rounded-[9px] border border-line bg-white px-3 text-[11px] font-medium text-muted transition-colors hover:text-ink",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Next
        </a>
      </div>
    </div>
  );
}
