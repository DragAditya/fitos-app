import { cn } from "@/lib/utils";

export function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5", className)}>
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd className="max-w-[64%] text-right text-[12px] font-medium leading-relaxed text-ink">
        {value || "—"}
      </dd>
    </div>
  );
}

export function DetailList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-line/80", className)}>{children}</dl>;
}
