import { describe, expect, it } from "vitest";
import {
  createGymQrToken,
  createQrToken,
  GYM_QR_WINDOW_MS,
  parseGymQrToken,
  parseQrToken,
  verifyGymQrToken,
  verifyQrToken,
} from "@/lib/qr-token";

const claims = {
  publicId: "6f1e6e6e-0000-4000-8000-000000000001",
  nonce: 4,
  memberId: "member-uuid-1234",
  gymId: "gym-uuid-5678",
};
const secret = "test-secret-that-is-long-enough-for-hmac";

describe("createQrToken", () => {
  it("builds a five-part opaque payload", () => {
    const token = createQrToken(claims, secret);
    const parts = token.split(":");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe("fitos");
    expect(parts[1]).toBe("v1");
    expect(parts[2]).toBe(claims.publicId);
    expect(parts[3]).toBe("4");
  });

  it("does not embed member or gym identifiers in plaintext", () => {
    const token = createQrToken(claims, secret);
    expect(token).not.toContain(claims.memberId);
    expect(token).not.toContain(claims.gymId);
  });

  it("rejects incomplete claims", () => {
    expect(() => createQrToken({ ...claims, publicId: "" }, secret)).toThrow();
    expect(() => createQrToken({ ...claims, nonce: 0.5 }, secret)).toThrow();
  });
});

describe("parseQrToken", () => {
  it("extracts the public id and nonce", () => {
    const token = createQrToken(claims, secret);
    expect(parseQrToken(token)).toEqual({ publicId: claims.publicId, nonce: 4 });
  });

  it("rejects malformed payloads", () => {
    expect(parseQrToken("")).toBeNull();
    expect(parseQrToken("fitos:v1:abc:1")).toBeNull();
    expect(parseQrToken("other:v1:abc:1:sig")).toBeNull();
    expect(parseQrToken("fitos:v1::1:sig")).toBeNull();
    expect(parseQrToken("fitos:v1:abc:0:sig")).toBeNull();
    expect(parseQrToken("fitos:v1:abc:-1:sig")).toBeNull();
    expect(parseQrToken("fitos:v1:abc:1.5:sig")).toBeNull();
  });
});

describe("verifyQrToken", () => {
  it("accepts a token signed with the same secret and claims", () => {
    const token = createQrToken(claims, secret);
    expect(verifyQrToken(token, claims, secret)).toBe(true);
  });

  it("rejects the wrong secret", () => {
    const token = createQrToken(claims, secret);
    expect(verifyQrToken(token, claims, `${secret}-different`)).toBe(false);
  });

  it("rejects a rotated nonce", () => {
    const token = createQrToken(claims, secret);
    expect(verifyQrToken(token, { ...claims, nonce: claims.nonce + 1 }, secret)).toBe(false);
  });

  it("rejects a token minted for another member or gym", () => {
    const token = createQrToken(claims, secret);
    expect(verifyQrToken(token, { ...claims, memberId: "someone-else" }, secret)).toBe(false);
    expect(verifyQrToken(token, { ...claims, gymId: "another-gym" }, secret)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createQrToken(claims, secret);
    const parts = token.split(":");
    parts[4] = `${parts[4]?.slice(0, -2)}AA`;
    expect(verifyQrToken(parts.join(":"), claims, secret)).toBe(false);
  });
});

describe("gym check-in QR tokens", () => {
  const now = 1_760_000_000_000;
  const window = Math.floor(now / GYM_QR_WINDOW_MS);
  const gymId = "3f7d1e6e-0000-4000-8000-000000000001";

  it("mints an opaque five-part gym token", () => {
    const token = createGymQrToken({ gymId, window }, secret);
    const parts = token.split(":");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe("fitos-gym");
    expect(parts[1]).toBe("v1");
    expect(parts[2]).not.toBe(gymId);
    expect(token).not.toContain(gymId);
    expect(parseGymQrToken(token)).toEqual({ gymId, window });
  });

  it("accepts the current and previous minute windows", () => {
    const token = createGymQrToken({ gymId, window }, secret);
    expect(verifyGymQrToken(token, secret, now)).toMatchObject({ ok: true, gymId, window });
    expect(
      verifyGymQrToken(token, secret, now + GYM_QR_WINDOW_MS),
    ).toMatchObject({ ok: true, window });
  });

  it("rejects expired and future windows", () => {
    const token = createGymQrToken({ gymId, window }, secret);
    expect(verifyGymQrToken(token, secret, now + GYM_QR_WINDOW_MS * 2)).toEqual({
      ok: false,
      code: "EXPIRED_GYM_TOKEN",
    });
    expect(verifyGymQrToken(token, secret, now - GYM_QR_WINDOW_MS)).toEqual({
      ok: false,
      code: "EXPIRED_GYM_TOKEN",
    });
  });

  it("rejects a wrong secret, tampering and malformed payloads", () => {
    const token = createGymQrToken({ gymId, window }, secret);
    expect(verifyGymQrToken(token, `${secret}-different`, now).ok).toBe(false);
    const parts = token.split(":");
    parts[3] = String(window + 1);
    expect(verifyGymQrToken(parts.join(":"), secret, now).ok).toBe(false);
    expect(verifyGymQrToken("fitos-gym:v1:nope", secret, now).ok).toBe(false);
    expect(parseGymQrToken("fitos-gym:v1::1:sig")).toBeNull();
  });
});
