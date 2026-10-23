import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[11px] text-[13px] font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white shadow-[0_1px_2px_rgba(18,18,22,.18)] hover:bg-[#26262c]",
        gradient:
          "accent-gradient text-white shadow-[0_8px_20px_-12px_rgba(78,84,232,.9)] hover:brightness-[1.06]",
        secondary:
          "border border-line bg-surface text-ink shadow-[0_1px_2px_rgba(18,18,22,.03)] hover:bg-[#fafaf8]",
        soft: "bg-[#f0f0ec] text-ink hover:bg-[#e9e9e4]",
        ghost: "text-muted hover:bg-[#efefeb] hover:text-ink",
        destructive: "bg-danger text-white hover:bg-[#a92e29]",
        outlineDanger:
          "border border-[#efcecc] bg-white text-danger hover:bg-[#fff6f5]",
        link: "h-auto rounded-none p-0 text-accent-strong underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[12px]",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-sm",
        icon: "size-9 p-0",
        iconSm: "size-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" /> : null}
          {children}
        </>
      )}
    </Component>
  );
}
