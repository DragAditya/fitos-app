const DEV_QR_SECRET = "fitos-local-development-qr-secret-change-me";

export function getQrSecret(): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (secret && secret.length >= 24) return secret;
  if (process.env.NODE_ENV === "production" && process.env.FITOS_ALLOW_DEV_SECRETS !== "true") {
    throw new Error("QR_TOKEN_SECRET must be configured with at least 24 characters in production.");
  }
  return DEV_QR_SECRET;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function allowDemoLogin() {
  return process.env.FITOS_DEMO_MODE !== "false";
}

export function showResetLink() {
  return process.env.NODE_ENV !== "production" || process.env.FITOS_SHOW_RESET_LINK === "true";
}
