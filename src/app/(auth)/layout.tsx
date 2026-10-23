import { Brand } from "@/components/brand";
import { ShieldCheck, Sparkles, UsersRound } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f6f3] lg:grid lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#111114] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 fine-grid opacity-[0.14]" />
        <div className="absolute -right-32 top-1/4 size-[460px] rounded-full bg-[#655df0]/30 blur-[110px]" />
        <div className="absolute -bottom-24 -left-24 size-[360px] rounded-full bg-[#9a68f7]/20 blur-[100px]" />
        <div className="relative z-10">
          <Brand href="/" className="[&_span]:text-white" showTagline />
        </div>
        <div className="relative z-10 my-auto max-w-[460px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/65">
            <Sparkles className="size-3 text-[#b8b2ff]" /> The calm gym operating system
          </span>
          <h2 className="mt-7 text-[42px] font-semibold leading-[1.02] tracking-[-0.05em]">
            Less admin.
            <br />
            More <span className="text-[#afa8ff]">time on the floor.</span>
          </h2>
          <p className="mt-5 max-w-[360px] text-[14px] leading-relaxed text-white/55">
            Members, plans, QR check-ins, payments and reports. One considered place,
            built for independent gyms.
          </p>

          <div className="mt-10 grid max-w-[420px] grid-cols-2 gap-3">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
              <UsersRound className="size-4 text-[#b9b3ff]" />
              <p className="mt-5 text-[25px] font-semibold tracking-[-0.04em]">24</p>
              <p className="text-[10.5px] text-white/45">members, one view</p>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
              <ShieldCheck className="size-4 text-[#8ee0bd]" />
              <p className="mt-5 text-[25px] font-semibold tracking-[-0.04em]">100%</p>
              <p className="text-[10.5px] text-white/45">server-verified access</p>
            </div>
          </div>

          <blockquote className="mt-10 border-l border-white/15 pl-5">
            <p className="text-[13px] leading-relaxed text-white/65">
              “It feels less like software and more like a very organised front desk.”
            </p>
            <footer className="mt-3 text-[10.5px] text-white/35">Aarav Mehta · Ironclad Strength Club</footer>
          </blockquote>
        </div>
        <p className="relative z-10 text-[10px] text-white/30">© {new Date().getFullYear()} FitOS</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Brand href="/" showTagline />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
