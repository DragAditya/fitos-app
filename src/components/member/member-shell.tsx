"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  CreditCard,
  House,
  ReceiptText,
  ScanLine,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/me", label: "Home", icon: House, exact: true },
  { href: "/me/membership", label: "Plan", icon: CreditCard },
  { href: "/me/attendance", label: "Visits", icon: CalendarCheck },
  { href: "/me/payments", label: "Billing", icon: ReceiptText },
  { href: "/me/qr", label: "Check in", icon: ScanLine, primary: true },
];

export function MemberShell({
  children,
  user,
  gym,
  unreadCount,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  gym: { name: string };
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f6f3]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[320px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,91,232,.10),transparent_72%)]" />
      <header className="sticky top-0 z-30 border-b border-line/70 bg-[#f6f6f3]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[760px] items-center gap-3 px-4">
          <Link href="/me" aria-label="FitOS home" className="flex items-center gap-2">
            <BrandMark className="size-8 rounded-[10px]" />
            <span className="hidden text-[15px] font-semibold tracking-[-0.03em] sm:block">FitOS</span>
          </Link>
          <span className="hidden truncate text-[10.5px] text-soft sm:block">· {gym.name}</span>
          <div className="flex-1" />
          <Link
            href="/me/notifications"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            className="relative grid size-9 place-items-center rounded-full border border-line bg-white/80 text-[#6b6b73]"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-[#5b5ce2] px-1 text-[8px] font-bold leading-4 text-white ring-2 ring-[#f6f6f3]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <Link href="/me/profile" aria-label="Your profile">
            <Avatar name={user.name} size="sm" ring />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[760px] px-4 pb-32 pt-5 sm:px-6 sm:pt-8">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4">
        <nav className="mx-auto flex max-w-[560px] items-end justify-between rounded-[20px] border border-white/70 bg-white/92 px-2 py-2 shadow-[0_18px_50px_-18px_rgba(18,18,22,.35)] backdrop-blur-xl">
          {ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            if (item.primary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className="group -mt-5 flex min-w-[54px] flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "grid size-[52px] place-items-center rounded-[17px] text-white shadow-[0_10px_24px_-10px_rgba(78,84,232,.9)] transition-transform group-active:scale-95",
                      active ? "accent-gradient" : "bg-ink",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className={cn("text-[9.5px] font-medium", active ? "text-ink" : "text-soft")}>
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[54px] flex-col items-center gap-1 rounded-[13px] py-1.5 transition-colors",
                  active ? "text-ink" : "text-[#96969e]",
                )}
              >
                <Icon className={cn("size-[18px]", active && "text-[#5551d4]")} strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn("text-[9.5px]", active ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
