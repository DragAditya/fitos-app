"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#dcdcd6] p-[3px] transition-colors duration-300 data-[state=checked]:bg-[#151519] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-white shadow-[0_2px_5px_rgba(18,18,22,.2)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
