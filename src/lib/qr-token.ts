import { createHmac, timingSafeEqual } from "node:crypto";

export const QR_PREFIX = "fitos:v1";

export type QrTokenClaims = {
  publicId: string;
  nonce: number;
  memberId: string;
  gymId: string;
};

function signature(claims: QrTokenClaims, secret: string) {
  return createHmac("sha256", secret)
    .update(`${claims.publicId}.${claims.nonce}.${claims.memberId}.${claims.gymId}`)
    .digest("base64url");
}

/**
 * The QR payload intentionally contains only an opaque database id, a rotation
 * nonce and an HMAC signature. No name, email, phone or membership data is encoded.
 */
export function createQrToken(claims: QrTokenClaims, secret: string): string {
  if (!claims.publicId || !claims.memberId || !claims.gymId || !Number.isInteger(claims.nonce)) {
    throw new Error("Invalid QR token claims");
  }
  return [
    QR_PREFIX,
    claims.publicId,
    String(claims.nonce),
    signature(claims, secret),
  ].join(":");
}

export type ParsedQrToken = { publicId: string; nonce: number };

export function parseQrToken(raw: string): ParsedQrToken | null {
  const parts = raw.trim().split(":");
  if (parts.length !== 5) return null;
  const [prefix, version, publicId, nonceRaw, sig] = parts;
  if (`${prefix}:${version}` !== QR_PREFIX) return null;
  if (!publicId || !sig) return null;
  const nonce = Number(nonceRaw);
  if (!Number.isSafeInteger(nonce) || nonce < 1) return null;
  return { publicId, nonce };
}

export function verifyQrToken(raw: string, resolved: QrTokenClaims, secret: string): boolean {
  const parsed = parseQrToken(raw);
  if (!parsed) return false;
  if (parsed.publicId !== resolved.publicId || parsed.nonce !== resolved.nonce) return false;

  const parts = raw.trim().split(":");
  const provided = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(signature(resolved, secret), "base64url");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Gym check-in QR tokens are intentionally stateless: the owner screen mints
 * a new code every 60 seconds, and membership/status checks happen after the
 * member authenticates. A member can never check in using another gym's code.
 */
export const GYM_QR_PREFIX = "fitos-gym:v1";
export const GYM_QR_WINDOW_MS = 60_000;

export type GymQrTokenClaims = {
  gymId: string;
  window: number;
};

function gymSignature(claims: GymQrTokenClaims, secret: string) {
  return createHmac("sha256", secret)
    .update(`${claims.gymId}.${claims.window}`)
    .digest("base64url");
}

export function createGymQrToken(claims: GymQrTokenClaims, secret: string): string {
  if (!claims.gymId || !Number.isSafeInteger(claims.window) || claims.window < 0) {
    throw new Error("Invalid gym QR token claims");
  }
  return [
    GYM_QR_PREFIX,
    Buffer.from(claims.gymId, "utf8").toString("base64url"),
    String(claims.window),
    gymSignature(claims, secret),
  ].join(":");
}

export type ParsedGymQrToken = {
  gymId: string;
  window: number;
};

export function parseGymQrToken(raw: string): ParsedGymQrToken | null {
  const parts = raw.trim().split(":");
  if (parts.length !== 5) return null;
  const [prefix, version, encodedGymId, windowRaw, sig] = parts;
  if (`${prefix}:${version}` !== GYM_QR_PREFIX) return null;
  if (!encodedGymId || !sig) return null;
  const gymId = Buffer.from(encodedGymId, "base64url").toString("utf8");
  if (!gymId) return null;
  const window = Number(windowRaw);
  if (!Number.isSafeInteger(window) || window < 0) return null;
  return { gymId, window };
}

export type GymQrVerification =
  | { ok: true; gymId: string; window: number; currentWindow: number }
  | { ok: false; code: "INVALID_GYM_TOKEN" | "EXPIRED_GYM_TOKEN" };

export function verifyGymQrToken(
  raw: string,
  secret: string,
  now = Date.now(),
): GymQrVerification {
  const parsed = parseGymQrToken(raw);
  if (!parsed) return { ok: false, code: "INVALID_GYM_TOKEN" };

  const currentWindow = Math.floor(now / GYM_QR_WINDOW_MS);
  // Accept the current window and the preceding one. A code minted at
  // 12:00:59 is still valid when the member's phone opens it at 12:01:01.
  if (parsed.window < currentWindow - 1 || parsed.window > currentWindow) {
    return { ok: false, code: "EXPIRED_GYM_TOKEN" };
  }

  const parts = raw.trim().split(":");
  const provided = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(gymSignature(parsed, secret), "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, code: "INVALID_GYM_TOKEN" };
  }
  return { ok: true, gymId: parsed.gymId, window: parsed.window, currentWindow };
}
