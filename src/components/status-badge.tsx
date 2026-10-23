import { Badge } from "@/components/ui/badge";

type Variant =
  | "neutral"
  | "active"
  | "expiring"
  | "expired"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "inactive"
  | "suspended";

const map: Record<string, { variant: Variant; label?: string }> = {
  active: { variant: "active" },
  expiring: { variant: "expiring", label: "Expiring soon" },
  expired: { variant: "expired" },
  cancelled: { variant: "inactive", label: "Cancelled" },
  pending: { variant: "pending" },
  completed: { variant: "inactive", label: "Completed" },
  paid: { variant: "paid" },
  failed: { variant: "failed" },
  refunded: { variant: "refunded" },
  inactive: { variant: "inactive" },
  suspended: { variant: "suspended" },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const item = map[status] ?? { variant: "neutral" as Variant };
  return (
    <Badge variant={item.variant} className={className}>
      {status === "active" || status === "paid" || status === "expiring" ? (
        <span
          className={`size-1.5 rounded-full ${
            status === "active"
              ? "bg-[#19966d]"
              : status === "expiring"
                ? "bg-[#c88a20]"
                : "bg-[#19966d]"
          }`}
        />
      ) : null}
      {label ?? item.label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
