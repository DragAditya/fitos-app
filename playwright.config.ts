import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      FITOS_DATA_DIR: ".data/e2e",
      QR_TOKEN_SECRET: "e2e-qr-secret-not-for-production-0123456789",
      NEXT_PUBLIC_APP_URL: BASE_URL,
      FITOS_SEED_DEMO: "true",
      FITOS_DEMO_MODE: "true",
      FITOS_SHOW_RESET_LINK: "false",
    },
  },
});
