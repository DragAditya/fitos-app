import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { databaseDriver, queryOne } from "@/server/db/client";
import { getGymSettings } from "@/server/services/accounts";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { SettingsHero } from "@/components/owner/settings-hero";
import { SettingsNav } from "@/components/owner/settings-nav";
import { GymSettingsForm } from "@/components/owner/settings-form";
import { AccountSettings } from "@/components/owner/account-settings";
import { DataSettings } from "@/components/owner/data-settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const auth = await requireOwner();
  const [storedGym, stats, sessionRow] = await Promise.all([
    getGymSettings(auth.gym.id),
    queryOne<{ members: number; plans: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM gym_members WHERE gym_id = $1) AS members,
         (SELECT COUNT(*)::int FROM membership_plans WHERE gym_id = $1 AND archived_at IS NULL) AS plans`,
      [auth.gym.id],
    ),
    queryOne<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM sessions WHERE user_id = $1 AND expires_at > now()",
      [auth.profile.id],
    ),
  ]);

  const gym = storedGym ?? auth.gym;
  const demoSeed = process.env.FITOS_SEED_DEMO !== "false";
  const driver = databaseDriver();
  const profileFields = [
    gym.name,
    gym.phone,
    gym.email,
    gym.address,
    gym.city,
    gym.logo_url,
    gym.receipt_footer,
  ];
  const profileFilled = profileFields.filter((value) => Boolean(value && String(value).trim())).length;
  const profileTotal = profileFields.length;
  const completeness = Math.round((profileFilled / profileTotal) * 100);
  const sessionCount = Math.max(1, sessionRow?.count ?? 1);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace control"
        title="Settings"
        description="Shape the identity, access rules and security of your gym from one calm workspace."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard">
              <LayoutDashboard /> Overview
            </Link>
          </Button>
        }
      />

      <SettingsHero
        gym={{
          name: gym.name,
          slug: gym.slug,
          city: gym.city,
          logo_url: gym.logo_url,
          timezone: gym.timezone,
          currency: gym.currency,
        }}
        ownerName={auth.profile.full_name}
        memberCount={stats?.members ?? 0}
        planCount={stats?.plans ?? 0}
        completeness={completeness}
        profileFilled={profileFilled}
        profileTotal={profileTotal}
        lastUpdated={formatDate(gym.updated_at, gym.timezone)}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[228px_minmax(0,1fr)]">
        <SettingsNav />

        <div className="min-w-0 space-y-5">
          <GymSettingsForm gym={gym} />
          <AccountSettings
            profile={{
              fullName: auth.profile.full_name,
              email: auth.profile.email,
              phone: auth.profile.phone,
              memberSince: formatDate(auth.profile.created_at, gym.timezone),
            }}
            sessionCount={sessionCount}
          />
          <DataSettings gym={{ id: gym.id, slug: gym.slug }} driver={driver} demoSeed={demoSeed} />
        </div>
      </div>
    </div>
  );
}
