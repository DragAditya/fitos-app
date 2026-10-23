import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex select-none items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
  {
    variants: {
      variant: {
        neutral: "border-[#e6e6e1] bg-[#f5f5f1] text-[#66666e]",
        active: "border-[#cfeade] bg-[#edf9f2] text-[#15805d]",
        expiring: "border-[#f4e2bf] bg-[#fff8e9] text-[#9a5d00]",
        expired: "border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33]",
        pending: "border-[#dcdbf8] bg-[#f2f1ff] text-[#514dcd]",
        suspended: "border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33]",
        inactive: "border-[#e6e6e1] bg-[#f5f5f1] text-[#7c7c84]",
        paid: "border-[#cfeade] bg-[#edf9f2] text-[#15805d]",
        failed: "border-[#f0d3d0] bg-[#fff4f2] text-[#b23b33]",
        refunded: "border-[#dcdbf8] bg-[#f2f1ff] text-[#514dcd]",
        outline: "border-line bg-white text-muted",
        accent: "border-[#dedcfb] bg-[#f1f0ff] text-[#514dcd]",
        dark: "border-transparent bg-ink text-white",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
