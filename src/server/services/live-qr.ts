import "server-only";

import QRCode from "qrcode";
import {
  createGymQrToken,
  GYM_QR_WINDOW_MS,
  verifyGymQrToken,
} from "@/lib/qr-token";
import { getAppUrl, getQrSecret } from "@/server/env";
import { queryOne } from "@/server/db/client";

export type LiveCheckInQr = {
  token: string;
  url: string;
  svg: string;
  window: number;
  expiresAt: number;
  serverNow: number;
  secondsRemaining: number;
};

export type LiveCheckInGym = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
};

export async function createLiveCheckInQr(
  gymId: string,
  now = Date.now(),
): Promise<LiveCheckInQr> {
  const window = Math.floor(now / GYM_QR_WINDOW_MS);
  const token = createGymQrToken({ gymId, window }, getQrSecret());
  const url = `${getAppUrl()}/checkin?t=${encodeURIComponent(token)}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 420,
    errorCorrectionLevel: "M",
    color: { dark: "#111114", light: "#ffffff" },
  });
  const expiresAt = (window + 1) * GYM_QR_WINDOW_MS;
  return {
    token,
    url,
    svg,
    window,
    expiresAt,
    serverNow: now,
    secondsRemaining: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
  };
}

export async function resolveGymCheckInToken(rawToken: string) {
  const verification = verifyGymQrToken(rawToken.trim(), getQrSecret());
  if (!verification.ok) {
    return {
      ok: false as const,
      code: verification.code,
      message:
        verification.code === "EXPIRED_GYM_TOKEN"
          ? "This gym QR code has expired. Ask the front desk to refresh the screen."
          : "This is not a valid FitOS gym check-in code.",
    };
  }

  const gym = await queryOne<LiveCheckInGym>(
    "SELECT id, name, slug, timezone, currency FROM gyms WHERE id = $1",
    [verification.gymId],
  );
  if (!gym) {
    return {
      ok: false as const,
      code: "INVALID_GYM_TOKEN" as const,
      message: "This gym is no longer available.",
    };
  }

  return { ok: true as const, gym, verification };
}

export async function getLiveCheckInQr(gymId: string): Promise<LiveCheckInQr> {
  return createLiveCheckInQr(gymId);
}
