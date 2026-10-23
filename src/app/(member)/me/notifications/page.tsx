import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/server/auth/session";
import { getMemberNotifications } from "@/server/services/notifications";
import { MemberNotificationList } from "@/components/member/member-forms";

export const metadata = { title: "Notifications" };

export default async function MemberNotificationsPage() {
  const auth = await requireMember();
  const notifications = await getMemberNotifications(auth.gym.id, auth.member.id, { limit: 60 });
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="space-y-5">
      <Link href="/me" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Home
      </Link>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-soft">Inbox</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.045em]">Notifications</h1>
        <p className="mt-1 text-[11.5px] text-muted">
          {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"} from ${auth.gym.name}.` : `You are up to date with ${auth.gym.name}.`}
        </p>
      </div>

      <MemberNotificationList notifications={notifications} />
    </div>
  );
}
