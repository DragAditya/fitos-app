import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberPasswordForm, MemberProfileForm } from "@/components/member/member-forms";
import { logoutAction } from "@/server/actions/auth";

export const metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const auth = await requireMember();

  return (
    <div className="space-y-5">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={auth.profile.full_name} size="xl" ring />
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-[-0.045em]">{auth.profile.full_name}</h1>
          <p className="truncate text-[11.5px] text-muted">{auth.profile.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="dark">Member</Badge>
            <Badge variant="outline">{auth.member.member_code}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Personal details</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Keep these current so the gym can reach you if needed.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <MemberProfileForm member={auth.member} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Password</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Changing your password signs out nothing else; sessions stay valid until they expire.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <MemberPasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Account</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Your connected gym and account details</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between rounded-[12px] border border-line p-3.5">
            <span className="text-[11.5px] text-muted">Gym</span>
            <span className="text-[12px] font-medium">{auth.gym.name}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-line p-3.5">
            <span className="text-[11.5px] text-muted">Member since</span>
            <span className="text-[12px] font-medium">{formatDate(auth.member.joined_at, auth.gym.timezone)}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-line p-3.5">
            <span className="text-[11.5px] text-muted">Email</span>
            <span className="max-w-[200px] truncate text-[12px] font-medium">{auth.profile.email}</span>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" className="w-full"><LogOut /> Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
