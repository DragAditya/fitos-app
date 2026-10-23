"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { GymLogo } from "@/components/owner/gym-logo";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogSheet,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";

const NAV = [
  {
    group: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Members", href: "/members", icon: Users },
      { label: "Memberships", href: "/plans", icon: CreditCard },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Payments", href: "/payments", icon: ChartNoAxesCombined },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Reports", href: "/reports", icon: Sparkles },
    ],
  },
  {
    group: "Manage",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

const TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/members\/[^/]+\/edit/, title: "Edit member" },
  { match: /^\/members\/[^/]+/, title: "Member profile" },
  { match: /^\/members/, title: "Members" },
  { match: /^\/plans/, title: "Memberships" },
  { match: /^\/attendance/, title: "Attendance" },
  { match: /^\/payments/, title: "Payments" },
  { match: /^\/notifications/, title: "Notifications" },
  { match: /^\/reports/, title: "Reports" },
  { match: /^\/settings/, title: "Settings" },
  { match: /^\/dashboard/, title: "Overview" },
];

export function OwnerShell({
  children,
  user,
  gym,
  todayLabel,
  pendingRenewals = 0,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  gym: { name: string; city: string | null; logoUrl?: string | null };
  todayLabel: string;
  pendingRenewals?: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (window.localStorage.getItem("fitos:owner-collapsed") !== "1") return;
    const frame = window.requestAnimationFrame(() => setCollapsed(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("fitos:owner-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const title = TITLES.find((item) => item.match.test(pathname))?.title ?? "Overview";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center border-b border-white/10 px-4",
          collapsed ? "justify-center" : "justify-between px-5",
        )}
      >
        {collapsed ? (
          <Link href="/dashboard" aria-label="FitOS dashboard">
            <BrandMark />
          </Link>
        ) : (
          <Brand href="/dashboard" showTagline className="[&_span]:text-white" />
        )}
      </div>

      <div className="px-3 pt-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-[13px] border border-white/10 bg-white/[0.045] p-2.5",
            collapsed && "justify-center p-2",
          )}
        >
          <GymLogo
            name={gym.name}
            logoUrl={gym.logoUrl}
            className="size-8 rounded-[9px] text-[11px]"
          />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-white">{gym.name}</span>
                <span className="block truncate text-[10px] text-white/35">{gym.city ?? "Workspace"}</span>
              </span>
              <ChevronDown className="size-3.5 text-white/30" />
            </>
          ) : null}
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV.map((section) => (
          <div key={section.group}>
            {!collapsed ? (
              <p className="mb-1.5 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.17em] text-white/25">
                {section.group}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[12.5px] font-medium transition-colors",
                      active
                        ? "bg-white/[0.085] text-white"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active ? (
                      <span className="absolute -left-3 h-4 w-[2.5px] rounded-full bg-[#a9a3ff]" />
                    ) : null}
                    <Icon
                      className={cn(
                        "size-[15px] shrink-0",
                        active ? "text-[#c4bfff]" : "text-white/30 group-hover:text-white/60",
                      )}
                    />
                    {!collapsed ? (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.href === "/plans" && pendingRenewals > 0 ? (
                          <span className="grid size-[18px] place-items-center rounded-full bg-[#7770f5]/20 text-[9px] font-semibold text-[#c4bfff]">
                            {pendingRenewals}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-[12px] p-1.5",
            collapsed && "justify-center",
          )}
        >
          <Avatar name={user.name} size="sm" />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[10px] text-white/35">{user.email}</p>
            </div>
          ) : null}
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-7 place-items-center rounded-[8px] text-white/35 hover:bg-white/10 hover:text-white">
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Gym settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Dumbbell /> Public site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="relative flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#b0443c] outline-none hover:bg-[#fff5f3]"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "mt-1 hidden h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-[10.5px] font-medium text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70 lg:flex",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
          {!collapsed ? "Collapse sidebar" : null}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[#25252d] bg-[#111114] backdrop-blur-xl transition-[width] duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[252px]",
        )}
      >
        {sidebar}
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogSheet side="left" className="z-[60] border-r border-[#25252d] bg-[#111114]">
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <DialogClose className="absolute right-3 top-4 z-10 grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/10">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div onClick={() => setMobileOpen(false)}>{sidebar}</div>
        </DialogSheet>
      </Dialog>

      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]")}>
        <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-[10px] border border-line bg-white text-muted lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>
            <div className="hidden min-w-0 items-baseline gap-2 sm:flex">
              <span className="text-[11px] font-medium text-soft">FitOS</span>
              <span className="text-[10px] text-[#c3c3c8]">/</span>
              <span className="truncate text-[12px] font-medium text-[#3f3f47]">{title}</span>
            </div>
            <div className="flex-1" />
            <form action="/members" className="relative hidden w-[230px] md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#a0a0a8]" />
              <input
                name="q"
                placeholder="Search members…"
                aria-label="Search members"
                className="h-9 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-[12px] text-ink placeholder:text-[#a3a3aa] focus:border-[#c9c8f4] focus:outline-none focus:ring-4 focus:ring-[#5b5ce2]/[0.06]"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-[#f7f7f4] px-1.5 py-0.5 text-[9px] text-soft">
                ↵
              </span>
            </form>
            <span className="hidden whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-[10.5px] font-medium text-muted xl:inline-flex">
              {todayLabel}
            </span>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative grid size-9 place-items-center rounded-[10px] border border-line bg-white text-muted transition-colors hover:text-ink"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e7a03b] ring-2 ring-white" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#9b99f1]">
                  <Avatar name={user.name} size="sm" ring />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block text-[11px] font-semibold normal-case tracking-normal text-ink">
                    {user.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-soft">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/me">
                    <UserRound /> Member view
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="relative flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[#b0443c] hover:bg-[#fff5f3]"
                  >
                    <LogOut className="size-3.5" /> Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
        <footer className="border-t border-line/70 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1 text-[10.5px] text-soft sm:flex-row sm:items-center sm:justify-between">
            <span>
              FitOS · {gym.name}
            </span>
            <span>Manage. Track. Grow.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
