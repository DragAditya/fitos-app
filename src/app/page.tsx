import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAuth } from "@/server/auth/session";

const features = [
  {
    icon: UsersRound,
    title: "Members, in one considered place",
    body: "Profiles, contact details, emergency contacts and full history. Search and filter without leaving the list.",
  },
  {
    icon: CreditCard,
    title: "Plans that stay legible",
    body: "Monthly, quarterly, annual or custom. Assign, renew, pause and see exactly who is active.",
  },
  {
    icon: QrCode,
    title: "Live QR check-in",
    body: "A rotating code on the owner screen. Members scan with their phone, confirm, and the server checks the rest.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Numbers you can trust",
    body: "Revenue, attendance and retention from the database, not decoration. Export CSV when you need it.",
  },
];

export default async function LandingPage() {
  const auth = await getAuth();
  const primaryHref = auth ? (auth.profile.role === "owner" ? "/dashboard" : "/me") : "/register";
  const primaryLabel = auth ? "Open workspace" : "Create your gym";

  return (
    <div className="min-h-screen bg-[#f6f6f3]">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-[#f6f6f3]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Brand showTagline />
          <nav className="hidden items-center gap-5 text-[12px] font-medium text-muted md:flex">
            <a href="#product" className="transition-colors hover:text-ink">Product</a>
            <a href="#roles" className="transition-colors hover:text-ink">For owners & members</a>
            <a href="#principles" className="transition-colors hover:text-ink">Principles</a>
          </nav>
          <div className="flex-1" />
          {auth ? (
            <Button asChild variant="primary" size="sm">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 fine-grid opacity-50" />
          <div className="pointer-events-none absolute left-1/2 top-[-300px] size-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(104,97,240,.16),transparent_65%)]" />
          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
            <div className="mx-auto max-w-[760px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dedcf8] bg-white/70 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#5954c9] shadow-sm">
                <Sparkles className="size-3" /> The fitness operating system
              </span>
              <h1 className="mt-7 text-[46px] font-semibold leading-[0.98] tracking-[-0.065em] sm:text-[72px]">
                Manage. Track.
                <br />
                <span className="text-gradient">Grow.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-[540px] text-[14px] leading-relaxed text-muted sm:text-[15.5px]">
                FitOS gives independent gyms one calm system for members, memberships, QR
                check-ins, payments and the numbers that tell you what is working.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Button asChild variant="gradient" size="lg" className="w-full sm:w-auto">
                  <Link href={primaryHref}>
                    {primaryLabel} <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link href={auth ? (auth.profile.role === "owner" ? "/members" : "/me/qr") : "/login"}>
                    {auth ? (auth.profile.role === "owner" ? "Browse members" : "Check in") : "Try the demo"}
                  </Link>
                </Button>
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-soft">
                <ShieldCheck className="size-3" /> Owner and member roles. Strict gym isolation.
              </p>
            </div>

            <div className="relative mx-auto mt-14 max-w-[980px]">
              <div className="absolute -inset-4 rounded-[34px] bg-gradient-to-b from-[#5b5ce2]/10 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-[#111114] p-2 shadow-[0_50px_120px_-40px_rgba(18,18,22,.5)] sm:rounded-[30px] sm:p-3">
                <div className="overflow-hidden rounded-[17px] border border-white/10 bg-[#f7f7f4] sm:rounded-[22px]">
                  <div className="flex h-11 items-center gap-2 border-b border-line bg-white/80 px-4">
                    <span className="size-2 rounded-full bg-[#e5e4df]" />
                    <span className="size-2 rounded-full bg-[#e5e4df]" />
                    <span className="size-2 rounded-full bg-[#e5e4df]" />
                    <span className="ml-3 rounded-md border border-line bg-white px-3 py-1 text-[8px] text-soft">
                      app.fit-os.local/dashboard
                    </span>
                  </div>
                  <div className="flex">
                    <div className="hidden w-[178px] shrink-0 border-r border-white/10 bg-[#131317] p-3 text-white sm:block">
                      <div className="flex items-center gap-1.5 px-1 pb-4 pt-1">
                        <BrandMark className="size-5 rounded-[6px]" />
                        <span className="text-[10px] font-semibold">FitOS<span className="text-[#a9a4ff]">.</span></span>
                      </div>
                      {["Overview", "Members", "Memberships", "Attendance", "Payments", "Reports"].map((item, index) => (
                        <div
                          key={item}
                          className={`mb-0.5 flex h-7 items-center rounded-[7px] px-2 text-[8.5px] font-medium ${
                            index === 0 ? "bg-white/[0.08] text-white" : "text-white/45"
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                      <div className="mt-7 rounded-[9px] border border-white/10 bg-white/[0.045] p-2.5">
                        <p className="text-[7.5px] text-white/40">This month</p>
                        <p className="mt-0.5 text-[13px] font-semibold tracking-[-0.03em] text-white">₹1,84,500</p>
                        <p className="mt-0.5 text-[7px] font-semibold text-[#7ac8a7]">+18.2% vs last month</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[7px] uppercase tracking-[0.14em] text-soft">Wednesday, 21 October</p>
                          <p className="mt-0.5 text-[13px] font-semibold tracking-[-0.03em]">Good morning, Aarav</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="grid size-6 place-items-center rounded-full border border-line bg-white text-[8px]">◌</span>
                          <Avatar name="Aarav Mehta" size="xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {[
                          ["Active members", "24", "+3 this month"],
                          ["Check-ins today", "11", "46% of active"],
                          ["Revenue this month", "₹38,000", "+12.4%"],
                          ["Expiring soon", "4", "within 7 days"],
                        ].map(([label, value, hint]) => (
                          <div key={label} className="rounded-[10px] border border-line bg-white p-2.5">
                            <p className="text-[7px] text-muted">{label}</p>
                            <p className="mt-1 text-[15px] font-semibold leading-none tracking-[-0.04em]">{value}</p>
                            <p className="mt-1 text-[6.5px] text-soft">{hint}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid gap-2 lg:grid-cols-[1.65fr_1fr]">
                        <div className="rounded-[10px] border border-line bg-white p-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[8.5px] font-semibold">Attendance</p>
                            <span className="rounded-full bg-[#f3f2ff] px-1.5 py-0.5 text-[6.5px] font-medium text-[#5954c9]">30 days</span>
                          </div>
                          <div className="mt-2 flex h-[76px] items-end gap-1">
                            {[35, 58, 44, 72, 50, 64, 32, 78, 68, 86, 54, 60, 74, 42, 56, 80, 62, 70, 48, 66, 76, 52, 84, 58, 68, 42, 64, 78, 56, 72].map((height, index) => (
                              <span
                                key={index}
                                className="flex-1 rounded-t-[2px] bg-gradient-to-t from-[#d9d7fb] to-[#7773e8]"
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[10px] border border-line bg-white p-2.5">
                          <p className="text-[8.5px] font-semibold">Today at the gym</p>
                          <div className="mt-2 space-y-2">
                            {[
                              ["Priya Shah", "09:42", "Monthly"],
                              ["Rahul Verma", "09:18", "Quarterly"],
                              ["Ananya Iyer", "08:56", "Monthly"],
                            ].map(([name, time, plan]) => (
                              <div key={name} className="flex items-center gap-1.5">
                                <Avatar name={name} size="xs" className="size-5 text-[7px]" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[7.5px] font-medium">{name}</p>
                                  <p className="text-[6.5px] text-soft">{plan}</p>
                                </div>
                                <span className="text-[6.5px] tabular text-soft">{time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="border-y border-line bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#706bd9]">One system</p>
                <h2 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-[-0.05em] sm:text-[40px]">
                  The work behind the workout, made quiet.
                </h2>
                <p className="mt-4 max-w-[380px] text-[13px] leading-relaxed text-muted">
                  FitOS is built around the shape of a real gym day: arrivals, renewals, payments,
                  and the small decisions that keep members coming back.
                </p>
                <Button asChild variant="secondary" className="mt-6">
                  <Link href={primaryHref}>Explore FitOS <ArrowRight /></Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="rounded-[20px] border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
                      <span className="grid size-9 place-items-center rounded-[11px] border border-[#e5e3fb] bg-[#f4f3ff] text-[#5b56cd]">
                        <Icon className="size-4" />
                      </span>
                      <h3 className="mt-4 text-[13.5px] font-semibold tracking-[-0.02em]">{feature.title}</h3>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{feature.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-[560px] text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#706bd9]">Two roles. No clutter.</p>
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-[-0.05em] sm:text-[40px]">
              An owner’s desk. A member’s pocket.
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              The same source of truth, shaped for where the work happens.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[24px] border border-line bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
              <div className="absolute right-0 top-0 size-48 rounded-full bg-[radial-gradient(circle,rgba(91,92,226,.12),transparent_70%)]" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dedcfb] bg-[#f3f2ff] px-2.5 py-1 text-[10px] font-semibold text-[#5551c8]">
                <UsersRound className="size-3" /> For owners
              </span>
              <h3 className="mt-5 text-[27px] font-semibold tracking-[-0.04em]">Run the whole floor.</h3>
              <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">
                A collapsible workspace for the front desk and the back office. Everything that
                happens is reflected in the next report.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  "Assign and renew memberships without guesswork",
                  "Display a live QR that members scan with their phone",
                  "Check in manually when a phone isn't available",
                  "Record payments with automatic advance credit",
                  "See attendance, revenue and expiries in real time",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-[12px] text-[#4d4d55]">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#edf9f2] text-positive">
                      <Check className="size-2.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[24px] border border-[#25252c] bg-[#131317] p-6 text-white shadow-[var(--shadow-lift)] sm:p-8">
              <div className="absolute -right-16 -top-16 size-64 rounded-full bg-[#5b5ce2]/25 blur-[60px]" />
              <div className="absolute inset-0 fine-grid opacity-[0.1]" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/75">
                  <QrCode className="size-3" /> For members
                </span>
                <h3 className="mt-5 text-[27px] font-semibold tracking-[-0.04em]">Carry less. Know more.</h3>
                <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-white/55">
                  A mobile-first home for the membership, the live gym check-in, visits and billing. No app
                  store detour, no member login to the owner workspace.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
                    <CalendarCheck className="size-3.5 text-[#a9a4ff]" />
                    <p className="mt-3 text-[20px] font-semibold tracking-[-0.04em]">12</p>
                    <p className="text-[9px] text-white/40">visits this month</p>
                  </div>
                  <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
                    <BellRing className="size-3.5 text-[#8edbb9]" />
                    <p className="mt-3 text-[20px] font-semibold tracking-[-0.04em]">3</p>
                    <p className="text-[9px] text-white/40">updates from the gym</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-[9px] bg-white text-ink">
                      <QrCode className="size-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-medium">Scan the gym code</p>
                      <p className="text-[8px] text-white/40">Point your camera at the front-desk screen</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#a9a4ff]/15 px-2 py-0.5 text-[8px] text-[#c4c0ff]">Live</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="principles" className="border-y border-line bg-[#fbfbf8]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-3">
            {[
              ["Server-side truth", "Every role check, gym boundary and QR validation happens on the server — not in a hidden button."],
              ["Persistence over demos", "Real PostgreSQL-compatible storage, migrations and audit logs. Demo data is labelled, never disguised."],
              ["Calm by default", "Warm surfaces, restrained motion and no vanity metrics. Just the state of the gym."],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d58ce]">{title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="relative overflow-hidden rounded-[28px] bg-[#111114] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
            <div className="absolute inset-0 fine-grid opacity-[0.12]" />
            <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5b5ce2]/25 blur-[90px]" />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Ready when you are</p>
              <h2 className="mx-auto mt-4 max-w-[520px] text-[34px] font-semibold leading-[1.05] tracking-[-0.05em] sm:text-[46px]">
                Give the admin back its afternoon.
              </h2>
              <p className="mx-auto mt-4 max-w-[430px] text-[13px] leading-relaxed text-white/55">
                Open a workspace, add your plans and bring your first member in. FitOS handles the
                rest of the trail.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Button asChild variant="gradient" size="lg">
                  <Link href={primaryHref}>{primaryLabel} <ArrowRight /></Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <Link href={auth ? "/" : "/login"}>{auth ? "Back to top" : "Sign in"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand showTagline />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/register" className="hover:text-ink">Create a gym</Link>
            <span className="text-soft">Built for independent gyms.</span>
            <span className="text-soft">© {new Date().getFullYear()} FitOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
