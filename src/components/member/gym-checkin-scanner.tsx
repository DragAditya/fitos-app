"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CameraOff, Loader2, ScanLine, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function extractToken(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("fitos-gym:")) return trimmed;
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("t");
    return token ?? null;
  } catch {
    return null;
  }
}

export function GymCheckInScanner() {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);
  const [active, setActive] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setActive(false);
    setStarting(false);
  }, []);

  React.useEffect(() => () => controlsRef.current?.stop(), []);

  async function start() {
    setError(undefined);
    setStarting(true);
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (scan) => {
        if (!scan) return;
        const token = extractToken(scan.getText());
        if (!token) {
          setError("That QR is not a FitOS gym check-in code. Point the camera at the code on the front desk screen.");
          return;
        }
        controlsRef.current?.stop();
        controlsRef.current = null;
        setActive(false);
        setStarting(false);
        router.push(`/checkin?t=${encodeURIComponent(token)}`);
      });
      controlsRef.current = controls;
      setActive(true);
      setStarting(false);
    } catch (scanError) {
      console.error(scanError);
      setStarting(false);
      setActive(false);
      setError(
        "Camera access is blocked or unavailable. Allow camera access in your browser, or scan the front desk QR with your phone camera app.",
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[9px] border border-[#dedcfb] bg-[#f4f3ff] text-[#5551d4]">
            <ScanLine className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold">Scan the gym code</p>
            <p className="text-[9.5px] text-soft">Point at the screen at the front desk</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-medium ${active ? "border border-[#cfeade] bg-[#f2fbf6] text-[#196a4e]" : "border border-line bg-[#fafaf7] text-soft"}`}>
          <span className={`size-1.5 rounded-full ${active ? "animate-pulse bg-[#2f9b74]" : "bg-[#c9c9c3]"}`} />
          {active ? "Camera live" : "Ready"}
        </span>
      </div>

      <div className="p-4">
        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[20px] border border-[#202027] bg-[#0f0f12]">
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-8 rounded-[18px] border border-white/20">
              {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-b-2 border-l-2", "right-0 bottom-0 border-b-2 border-r-2"].map((position) => (
                <span key={position} className={`absolute size-7 rounded-[2px] border-[#aaa4ff] ${position}`} />
              ))}
            </div>
            {active ? (
              <div className="absolute inset-x-10 top-8 h-px animate-scan bg-gradient-to-r from-transparent via-[#b2adff] to-transparent shadow-[0_0_12px_#918aff]" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
                <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5">
                  {starting ? <Loader2 className="size-5 animate-spin text-white/60" /> : <Camera className="size-5 text-white/50" />}
                </span>
                <p className="text-[10px] text-white/45">{starting ? "Starting camera…" : "Camera preview"}</p>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-3 flex gap-2.5 rounded-[13px] border border-[#f0d2cd] bg-[#fff7f5] p-3 text-[10.5px] leading-relaxed text-[#8c3d36]">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> {error}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          {active ? (
            <Button type="button" variant="secondary" className="flex-1" onClick={stop}>
              <CameraOff /> Stop camera
            </Button>
          ) : (
            <Button type="button" variant="gradient" className="flex-1" onClick={() => void start()} disabled={starting}>
              {starting ? <Loader2 className="animate-spin" /> : <Camera />} Start camera
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t border-line pt-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-soft">No camera in the app?</p>
          <p className="text-[10.5px] leading-relaxed text-muted">
            Open the camera app on your phone and point it at the QR on the front desk screen. It opens this same
            check-in page in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
