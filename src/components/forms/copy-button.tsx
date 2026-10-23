"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copy link",
  size = "sm",
  variant = "secondary",
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "soft" | "ghost" | "primary";
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select and copy the link manually.");
    }
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={copy}>
      {copied ? <Check className="text-positive" /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function CopyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[11px] border border-line bg-[#fbfbf8] p-1.5 pl-3">
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#4b4b53]">{value}</code>
      <CopyButton value={value} label="Copy" variant="secondary" />
    </div>
  );
}
