"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";
import { GymLogo } from "@/components/owner/gym-logo";

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function SettingsHero({
  gym,
  ownerName,
  memberCount,
  planCount,
  completeness,
  profileFilled,
  profileTotal,
  lastUpdated,
}: {
  gym: {
    name: string;
    slug: string;
    city: string | null;
    logo_url: string | null;
    timezone: string;
    currency: string;
  };
  ownerName: string;
  memberCount: number;
  planCount: number;
  completeness: number;
  profileFilled: number;
  profileTotal: number;
  lastUpdated: string;
}) {
  const heroRef = React.useRef<HTMLElement>(null);
  const ringOffset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, completeness)) / 100);

  function trackPointer(event: React.PointerEvent<HTMLElement>) {
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    hero.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <article
      ref={heroRef}
      onPointerMove={trackPointer}
      className="group relative overflow-hidden rounded-[28px] border border-[#25252d] bg-[#111114] text-white shadow-[0_30px_80px_-42px_rgba(17,17,20,.85)] animate-fade-up"
    >
      <div className="pointer-events-none absolute inset-0 fine-grid opacity-[0.09]" />
      <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(600px_circle_at_var(--spot-x,78%)_var(--spot-y,18%),rgba(146,140,255,.18),transparent_60%)]" />
      <div className="pointer-events-none absolute -right-24 -top-28 size-[360px] animate-float rounded-full bg-[#625df1]/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-36 left-1/4 size-[300px] rounded-full bg-[#9a68f7]/18 blur-[110px]" />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <GymLogo
            name={gym.name}
            logoUrl={gym.logo_url}
            className="size-[58px] rounded-[16px] text-[19px] shadow-[0_18px_40px_-20px_rgba(0,0,0,.9)] ring-white/10"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-medium text-white/60">
                <Sparkles className="size-3 text-[#c4bfff]" />
                Workspace control
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2d6b55] bg-[#14352a] px-2.5 py-1 text-[9px] font-medium text-[#a9f0d4]">
                <span className="size-1.5 rounded-full bg-[#6ee7b7]" />
                All systems normal
              </span>
            </div>
            <h2 className="mt-3 break-words text-[24px] font-semibold leading-[1.05] tracking-[-0.05em] sm:text-[30px]">
              {gym.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-white/40">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" /> {gym.city ?? "Add a city"}
              </span>
              <span className="text-white/20">·</span>
              <span className="font-mono text-[9.5px] text-white/35">/{gym.slug}</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9.5px] text-white/55">
                <ShieldCheck className="size-3 text-[#b9b5ff]" /> {ownerName} · Owner
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9.5px] text-white/55">
                <Globe2 className="size-3 text-[#8fe4c2]" /> {gym.timezone.replaceAll("_", " ")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9.5px] text-white/55">
                <Wallet className="size-3 text-[#f0b35a]" /> {gym.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.035] p-3 pr-4">
            <div className="relative grid size-[58px] place-items-center">
              <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
                <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="3" />
                <circle
                  cx="24"
                  cy="24"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="url(#profile-ring)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(.22,1,.36,1)]"
                />
                <defs>
                  <linearGradient id="profile-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8fe4c2" />
                    <stop offset="55%" stopColor="#a9a3ff" />
                    <stop offset="100%" stopColor="#d7b4ff" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-mono text-[12px] font-semibold tabular">{completeness}%</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/35">Brand profile</p>
              <p className="mt-1 text-[11.5px] font-medium text-white/80">
                {completeness === 100 ? "Complete" : `${profileFilled} of ${profileTotal} details`}
              </p>
              <p className="mt-0.5 text-[9.5px] text-white/35">
                {completeness === 100 ? "Every branded touchpoint is ready." : "Fill the gaps for polished receipts."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-[92px] rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2.5">
              <UsersRound className="size-3.5 text-[#b9b5ff]" />
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.05em] tabular">{memberCount}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">Members</p>
            </div>
            <div className="min-w-[92px] rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2.5">
              <CreditCard className="size-3.5 text-[#8fe4c2]" />
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.05em] tabular">{planCount}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">Plans</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-[9.5px] text-white/35 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3 text-[#a9a3ff]" />
          Changes are audited and enforced on the server.
        </span>
        <span className="inline-flex items-center gap-3">
          <span>Last updated {lastUpdated}</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-white/55 transition-colors hover:text-white"
          >
            Public site <ArrowUpRight className="size-3" />
          </Link>
        </span>
      </div>
    </article>
  );
}
