"use client";

import * as React from "react";
import {
  Check,
  Clock3,
  Copy,
  Expand,
  Loader2,
  Minimize2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type LiveQrPayload = {
  token: string;
  url: string;
  svg: string;
  window: number;
  expiresAt: number;
  serverNow: number;
  secondsRemaining: number;
};

const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function useServerClock(serverNow: number) {
  const offsetRef = React.useRef(0);
  const [now, setNow] = React.useState(serverNow);

  React.useEffect(() => {
    // Keep the browser clock aligned with the server that minted the code.
    // A device with the wrong timezone or clock must not hammer the API.
    offsetRef.current = serverNow - Date.now();
  }, [serverNow]);

  React.useEffect(() => {
    const tick = () => setNow(Date.now() + offsetRef.current);
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return { now, offsetRef };
}

export function LiveCheckInQr({
  initial,
  gymName,
  manualAction,
  compact = false,
  selfCheckinEnabled = true,
  className,
}: {
  initial: LiveQrPayload;
  gymName: string;
  manualAction?: React.ReactNode;
  compact?: boolean;
  selfCheckinEnabled?: boolean;
  className?: string;
}) {
  const [qr, setQr] = React.useState(initial);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [copied, setCopied] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const { now, offsetRef } = useServerClock(qr.serverNow);
  const seconds = Math.max(0, Math.ceil((qr.expiresAt - now) / 1000));
  const progress = Math.max(0, Math.min(1, seconds / 60));
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setError(undefined);
    try {
      const response = await fetch("/api/attendance/live-qr", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as
        | ({ ok: true } & LiveQrPayload)
        | { ok: false; message?: string };
      if (!response.ok || !payload.ok) {
        throw new Error("message" in payload ? payload.message : "Could not refresh the code.");
      }
      setQr(payload);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh the code.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const delay = Math.max(700, qr.expiresAt - (Date.now() + offsetRef.current) + 650);
    const timer = window.setTimeout(() => {
      void refresh();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [qr.expiresAt, refresh, offsetRef]);

  React.useEffect(() => {
    const onVisibility = () => {
      const nowMs = Date.now() + offsetRef.current;
      if (document.visibilityState === "visible" && nowMs >= qr.expiresAt - 1200) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [qr.expiresAt, refresh, offsetRef]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qr.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Your browser blocked clipboard access. Scan the code instead.");
    }
  }

  const qrBlock = (
    <div className="relative mx-auto w-full max-w-[248px]">
      <div className="relative overflow-hidden rounded-[20px] bg-white p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,.7)]">
        <div
          className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          aria-label={`Check-in QR code for ${gymName}`}
          role="img"
          dangerouslySetInnerHTML={{ __html: qr.svg }}
        />
        <div className="pointer-events-none absolute inset-x-6 top-6 h-px animate-scan bg-gradient-to-r from-transparent via-[#625df1] to-transparent shadow-[0_0_12px_#8c87ff]" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/45">
        <Wifi className="size-3 text-[#8fe4c2]" />
        <span>Live code · refreshes every 60 seconds</span>
      </div>
    </div>
  );

  const manualFooter = manualAction ? (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
      <p className="text-[11px] leading-relaxed text-white/45">
        No phone or camera? The front desk can check the member in manually.
      </p>
      <div className="[&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/15">
        {manualAction}
      </div>
    </div>
  ) : null;

  return (
    <>
      <article
        data-checkin-url={qr.url}
        className={`relative overflow-hidden rounded-[26px] border border-white/10 bg-[#111114] text-white shadow-[0_28px_70px_-35px_rgba(17,17,20,.85)] ${className ?? ""}`}
      >
        <div className="pointer-events-none absolute inset-0 fine-grid opacity-[0.1]" />
        <div className="pointer-events-none absolute -right-24 -top-28 size-[340px] rounded-full bg-[#625df1]/30 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-36 left-1/3 size-[300px] rounded-full bg-[#9a68f7]/15 blur-[100px]" />

        <div className="relative flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5">
              <ScanLine className="size-4 text-[#b9b5ff]" />
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#6ee7b7] shadow-[0_0_0_3px_rgba(110,231,183,.12)]" />
            </span>
            <div>
              <p className="text-[12px] font-semibold tracking-[-0.01em]">Front desk check-in</p>
              <p className="text-[9.5px] text-white/40">Members scan this with their phone camera</p>
            </div>
          </div>
          <span
            className={
              selfCheckinEnabled
                ? "inline-flex items-center gap-1.5 rounded-full border border-[#2d6b55] bg-[#14352a] px-2.5 py-1 text-[9px] font-medium text-[#a9f0d4]"
                : "inline-flex items-center gap-1.5 rounded-full border border-[#7a5a24] bg-[#3a2b15] px-2.5 py-1 text-[9px] font-medium text-[#ffd79b]"
            }
          >
            <span
              className={
                selfCheckinEnabled
                  ? "size-1.5 animate-pulse rounded-full bg-[#6ee7b7]"
                  : "size-1.5 rounded-full bg-[#f0b35a]"
              }
            />
            {selfCheckinEnabled ? "Live" : "Paused"}
          </span>
        </div>

        <div className={`relative grid gap-5 px-5 py-5 ${compact ? "" : "sm:grid-cols-[1fr_248px] sm:items-center"}`}>
          <div className="min-w-0 self-stretch">
            <div className="flex items-center gap-3">
              <div className="relative grid size-[58px] place-items-center">
                <svg viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90">
                  <circle cx="22" cy="22" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2.5" />
                  <circle
                    cx="22"
                    cy="22"
                    r={RING_RADIUS}
                    fill="none"
                    stroke="#8f8bff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-700 ease-linear"
                  />
                </svg>
                <span className="font-mono text-[13px] font-semibold tabular text-white">{seconds}s</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a9a6ff]">Rotating access code</p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.04em] text-white">
                  Scan. Confirm. Train.
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-[340px] text-[12px] leading-relaxed text-white/50">
              Open the camera on a member&apos;s phone, scan the code, and confirm the check-in. The code changes
              automatically; an expired code can&apos;t be reused.
            </p>

            {!selfCheckinEnabled ? (
              <p className="mt-3 max-w-[340px] rounded-[10px] border border-[#7a5a24] bg-[#3a2b15] px-3 py-2 text-[10px] leading-relaxed text-[#ffd79b]">
                Self check-in is paused in Settings. Members will see a paused screen; use manual check-in below.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check className="size-3 text-[#8fe4c2]" /> : <Copy className="size-3" />}
                {copied ? "Link copied" : "Copy check-in link"}
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Expand className="size-3" /> Full screen
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                Refresh now
              </button>
            </div>

            {error ? (
              <p className="mt-3 rounded-[9px] border border-[#7f3f35] bg-[#3b211e] px-2.5 py-2 text-[10px] leading-relaxed text-[#ffc7bf]">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-1.5 text-[9.5px] text-white/35">
              <ShieldCheck className="size-3" />
              Membership status and duplicate visits are checked on the server.
            </div>
          </div>

          <div className="justify-self-center">{qrBlock}</div>
        </div>

        {manualFooter}
      </article>

      {fullscreen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#0c0c0f]/97 p-5 text-white backdrop-blur-sm sm:p-8">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-[9px] border border-white/10 bg-white/5">
                <ScanLine className="size-4 text-[#b9b5ff]" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">{gymName}</p>
                <p className="text-[10px] text-white/40">Scan to check in</p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setFullscreen(false)}>
              <Minimize2 /> Close
            </Button>
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-[380px] rounded-[28px] bg-white p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,.8)]">
              <div
                className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
                aria-label={`Check-in QR code for ${gymName}`}
                role="img"
                dangerouslySetInnerHTML={{ __html: qr.svg }}
              />
            </div>
            <div className="mt-6 flex items-center gap-3 text-white/60">
              <Clock3 className="size-4" />
              <span className="text-[12px]">New code in {seconds}s</span>
              <button type="button" onClick={() => void refresh()} className="text-[11px] text-[#b9b5ff] hover:underline">
                Refresh now
              </button>
            </div>
            <p className="mt-3 max-w-sm text-center text-[11px] leading-relaxed text-white/35">
              Scan with a phone camera. Sign in as a member of {gymName} if prompted, then confirm the check-in.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
