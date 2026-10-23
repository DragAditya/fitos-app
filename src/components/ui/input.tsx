import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "flex h-10 w-full rounded-[11px] border border-line bg-white px-3 text-[13px] text-ink shadow-[0_1px_1px_rgba(18,18,22,.02)] transition-colors placeholder:text-[#a3a3aa] focus:border-[#c3c2f3] focus:outline-none focus:ring-4 focus:ring-[#5b5ce2]/[0.07] disabled:cursor-not-allowed disabled:bg-[#f7f7f4] disabled:text-muted";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(inputClass, className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClass, "min-h-[88px] resize-y px-3 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        inputClass,
        "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%236f6f76%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m3%204.5%203%203%203-3%22/%3E%3C/svg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Input, Textarea, NativeSelect };
