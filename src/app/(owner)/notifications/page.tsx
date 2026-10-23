import { BellRing, Mail, Megaphone, Users } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notifications";
import { getMemberOptions } from "@/server/services/members";
import { formatDateTime, timeAgo } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { AnnouncementDialog, ReminderActions } from "@/components/owner/notification-forms";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const auth = await requireOwner();
  const [notifications, members] = await Promise.all([
    listNotifications(auth.gym.id),
    getMemberOptions(auth.gym.id),
  ]);

  const totalRecipients = notifications.reduce((sum, item) => sum + (item.recipient_count ?? 0), 0);
  const totalReads = notifications.reduce((sum, item) => sum + (item.read_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="In-app notifications are persisted per recipient. Expiry and payment reminders are generated on demand — no scheduler is assumed."
        actions={
          <>
            <ReminderActions />
            <AnnouncementDialog members={members} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Notifications sent" value={notifications.length} icon={<Megaphone />} hint="All time" />
        <StatCard label="Recipients reached" value={totalRecipients} icon={<Users />} hint="Notification deliveries" />
        <StatCard label="Read" value={totalReads} icon={<BellRing />} hint={totalRecipients > 0 ? `${Math.round((totalReads / totalRecipients) * 100)}% read rate` : "No deliveries yet"} />
      </div>

      <Alert variant="info" icon={<Mail />} title="Delivery in this deployment">
        FitOS stores notifications in the database and shows them in each member’s inbox. No email or SMS provider is configured, so nothing leaves the app. Reminders are triggered by the buttons above rather than a background scheduler.
      </Alert>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sent history</CardTitle>
            <p className="mt-0.5 text-[11.5px] text-muted">Newest first · read counts update as members open their inbox</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {notifications.length ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const recipients = notification.recipient_count ?? 0;
                const reads = notification.read_count ?? 0;
                const percentage = recipients ? Math.round((reads / recipients) * 100) : 0;
                return (
                  <article key={notification.id} className="rounded-[16px] border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-line bg-[#fafaf7] text-muted">
                          <Megaphone className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[13px] font-semibold tracking-[-0.015em]">{notification.title}</h3>
                            <Badge variant={notification.kind === "expiry" ? "expiring" : notification.kind === "payment" ? "pending" : "neutral"}>{notification.kind}</Badge>
                            <Badge variant={notification.audience === "all" ? "accent" : "outline"}>{notification.audience === "all" ? "All members" : "Selected members"}</Badge>
                          </div>
                          <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-muted">{notification.body}</p>
                          <p className="mt-2 text-[10px] text-soft">{formatDateTime(notification.created_at, auth.gym.timezone)} · {timeAgo(notification.created_at)}</p>
                        </div>
                      </div>
                      <div className="min-w-[110px] text-right">
                        <p className="text-[12px] font-semibold tabular">{reads}/{recipients} read</p>
                        <p className="mt-0.5 text-[10px] text-soft">{percentage}% opened</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone />}
              title="No notifications sent"
              description="Send an announcement or generate reminder notifications for expiring memberships and outstanding balances."
              action={<AnnouncementDialog members={members} />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
