import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

const alertVariants = cva("rounded-[13px] border px-4 py-3 text-[12.5px] leading-relaxed", {
  variants: {
    variant: {
      info: "border-[#dedcf8] bg-[#f5f4ff] text-[#4b478f]",
      success: "border-[#d3ebdf] bg-[#f2fbf6] text-[#196a4e]",
      warning: "border-[#f0e1c4] bg-[#fffaf0] text-[#8a5a0a]",
      danger: "border-[#efd5d2] bg-[#fff6f5] text-[#a43c34]",
    },
  },
  defaultVariants: { variant: "info" },
});

export function Alert({
  className,
  variant,
  title,
  children,
  icon,
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants> & { title?: string; icon?: React.ReactNode }) {
  return (
    <div role="status" className={cn(alertVariants({ variant }), "flex items-start gap-2.5", className)}>
      {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <div>
        {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#eeeee9]", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full accent-gradient transition-[width] duration-700", barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-line bg-[#fafaf7] text-muted shadow-sm [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
