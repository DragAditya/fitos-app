import { requireMember } from "@/server/auth/session";
import { getUnreadNotificationCount } from "@/server/services/notifications";
import { MemberShell } from "@/components/member/member-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireMember();
  const unread = await getUnreadNotificationCount(auth.gym.id, auth.member.id);
  return (
    <MemberShell
      user={{ name: auth.profile.full_name, email: auth.profile.email }}
      gym={{ name: auth.gym.name }}
      unreadCount={unread}
    >
      {children}
    </MemberShell>
  );
}
