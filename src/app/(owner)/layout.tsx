import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/session";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login?next=/dashboard");
  if (auth.profile.role !== "owner" || !auth.gym) redirect("/unauthorized");
  const pendingRenewals = await import("@/server/db/client").then(({ queryOne }) =>
    queryOne<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM renewal_requests WHERE gym_id = $1 AND status = 'pending'",
      [auth.gym!.id],
    ),
  );
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: auth.gym.timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  const { OwnerShell } = await import("@/components/owner/owner-shell");
  return (
    <OwnerShell
      user={{ name: auth.profile.full_name, email: auth.profile.email }}
      gym={{ name: auth.gym.name, city: auth.gym.city, logoUrl: auth.gym.logo_url }}
      todayLabel={todayLabel}
      pendingRenewals={pendingRenewals?.count ?? 0}
    >
      {children}
    </OwnerShell>
  );
}
