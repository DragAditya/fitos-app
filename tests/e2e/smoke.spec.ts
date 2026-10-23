import { expect, test, type Page } from "@playwright/test";

async function submitSignIn(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("FitOS2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|me)$/, { timeout: 20_000 });
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  // A native submit before hydration reloads /login and drops the session cookie.
  // Wait for the client form's explicit hydration marker instead of a fixed delay.
  await page.locator('form[data-hydrated="true"]').waitFor();
  await submitSignIn(page, email);
}

test.describe("FitOS smoke", () => {
  test("owner can review every workspace screen", async ({ page }) => {
    await signIn(page, "owner@fitos.app");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aarav");
    await expect(page.getByText("Active members").first()).toBeVisible();

    await page.getByRole("navigation").getByRole("link", { name: "Members", exact: true }).click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();

    await page.getByPlaceholder("Name, email, phone or member code").fill("Riya");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/q=Riya/);
    await page.getByRole("link", { name: "Riya Kapoor", exact: true }).click();
    await expect(page).toHaveURL(/\/members\/[0-9a-f-]+$/);
    const detailUrl = page.url();
    await expect(page.getByText("Riya Kapoor").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Renew \/ change plan|Assign plan/ }).first(),
    ).toBeVisible();

    await page.goto(`${detailUrl}/edit`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit Riya Kapoor" }),
    ).toBeVisible();

    const screens = [
      ["/payments", "Payments"],
      ["/attendance", "Attendance"],
      ["/plans", "Memberships"],
      ["/notifications", "Notifications"],
      ["/reports", "Reports"],
      ["/settings", "Settings"],
    ] as const;

    for (const [path, heading] of screens) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }

    await page.goto("/attendance");
    await expect(page.getByText("Front desk check-in")).toBeVisible();
    const checkInUrl = await page.locator("[data-checkin-url]").getAttribute("data-checkin-url");
    expect(checkInUrl).toMatch(/\/checkin\?t=fitos-gym%3Av1%3A/);

    await page.goto("/payments");
    await expect(page.getByText("Manual entries, clearly labelled")).toBeVisible();
  });

  test("settings workspace exposes advanced owner controls", async ({ page }) => {
    await signIn(page, "owner@fitos.app");
    await page.goto("/settings");

    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gym profile" })).toBeVisible();
    await expect(page.getByText("Brand profile")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Allow member self check-in" })).toBeVisible();
    await expect(page.getByLabel("Member ID prefix")).toBeVisible();
    await expect(page.getByLabel("Receipt footer note")).toBeVisible();

    await page.getByRole("button", { name: /Owner account/ }).click();
    await expect(page.getByRole("heading", { name: "Owner account" })).toBeVisible();
    await expect(page.getByText("Active sessions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();

    await page.getByRole("button", { name: /Data & exports/ }).click();
    await expect(page.getByRole("heading", { name: "Data & exports" })).toBeVisible();
    await expect(page.getByText("Take your workspace with you.")).toBeVisible();
  });

  test("live QR opens the authenticated member check-in screen", async ({ page }) => {
    await signIn(page, "owner@fitos.app");
    await page.goto("/attendance");
    const checkInUrl = await page.locator("[data-checkin-url]").getAttribute("data-checkin-url");
    expect(checkInUrl).toBeTruthy();

    await page.context().clearCookies();
    await page.goto("/login?next=" + encodeURIComponent("/checkin?t=not-a-real-token"));
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await page.getByLabel("Email", { exact: true }).fill("member@fitos.app");
    await page.getByLabel("Password", { exact: true }).fill("FitOS2026!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "This isn't a valid check-in code" })).toBeVisible();

    await page.goto(new URL(checkInUrl!).pathname + new URL(checkInUrl!).search);
    await expect(page.getByText("Front desk check-in", { exact: false }).or(page.getByText("Live gym check-in"))).toBeVisible();
    await expect(page.getByText("Riya Kapoor").first()).toBeVisible();
  });

  test("member without an active plan sees a blocked check-in state", async ({ page }) => {
    await signIn(page, "owner@fitos.app");
    await page.goto("/attendance");
    const checkInUrl = await page.locator("[data-checkin-url]").getAttribute("data-checkin-url");
    expect(checkInUrl).toBeTruthy();

    await page.context().clearCookies();
    await signIn(page, "kabir.shah@example.com");
    await page.goto(new URL(checkInUrl!).pathname + new URL(checkInUrl!).search);
    await expect(page.getByText("Live gym check-in")).toBeVisible();
    await expect(page.getByText("Check-in is unavailable", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm check-in" })).toHaveCount(0);
  });

  test("manual check-in enforces eligibility and duplicates", async ({ page }) => {
    await signIn(page, "owner@fitos.app");
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { level: 1, name: "Attendance" })).toBeVisible();

    await page.getByRole("button", { name: "Manual check-in" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Manual check-in" })).toBeVisible();
    const memberSelect = dialog.getByLabel("Member");

    // Zoya has a live membership and no seeded check-in today (deterministic seed).
    await memberSelect.selectOption({ label: "Zoya Ali · IC-0014" });
    await dialog.getByRole("button", { name: "Record check-in" }).click();
    await expect(dialog.getByText(/Check-in recorded\./)).toBeVisible();

    // The same member cannot check in twice on the same day.
    await memberSelect.selectOption({ label: "Zoya Ali · IC-0014" });
    await dialog.getByRole("button", { name: "Record check-in" }).click();
    await expect(dialog.getByText(/already checked in today/)).toBeVisible();

    // A member without a membership is rejected with a specific reason.
    await memberSelect.selectOption({ label: "Tara Singh · IC-0011" });
    await dialog.getByRole("button", { name: "Record check-in" }).click();
    await expect(dialog.getByText(/No active membership was found/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("member can open the check-in scanner, history and a printable receipt", async ({ page }) => {
    await signIn(page, "member@fitos.app");
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Riya");
    await expect(page.getByText("Your membership", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Check in", exact: true }).first()).toBeVisible();

    await page.goto("/me/qr");
    await expect(page.getByRole("heading", { level: 1, name: "Check in" })).toBeVisible();
    await expect(page.getByText("Scan the gym code")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
    await expect(page.getByText("Camera frames are decoded on this device")).toBeVisible();

    await page.goto("/me/membership");
    await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();

    await page.goto("/me/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Riya Kapoor" })).toBeVisible();

    await page.goto("/me/notifications");
    await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();

    await page.goto("/me/attendance");
    await expect(page.getByRole("heading", { level: 1, name: "Your visits" })).toBeVisible();
    await expect(page.getByText("Visited", { exact: true })).toBeVisible();

    await page.goto("/me/payments");
    await expect(
      page.getByRole("heading", { level: 1, name: "Payments & receipts" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Receipt" }).first().click();
    await expect(page).toHaveURL(/\/receipts\/[0-9a-f-]+$/);
    await expect(page.getByRole("button", { name: "Print receipt" })).toBeVisible();
    await expect(page.getByText(/recorded manually at the .* front desk/i)).toBeVisible();
    await expect(page.getByText("gateway_verified: false")).toBeVisible();
  });

  test("notifications persist and can be marked read", async ({ page }) => {
    await signIn(page, "arjun.nair@example.com");
    await expect(page).toHaveURL(/\/me$/);

    await page.goto("/me/notifications");
    await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark all read" })).toBeVisible();

    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(
      page.getByText("You are up to date with Ironclad Strength Club."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark all read" })).toBeHidden();
  });

  test("workspace settings persist and pause self check-in", async ({ page }) => {
    const note = `E2E receipt note ${Date.now()}`;
    const selfCheckIn = page.getByRole("switch", { name: "Allow member self check-in" });
    const footer = page.getByLabel("Receipt footer note");

    await signIn(page, "owner@fitos.app");
    await page.goto("/settings");

    await footer.fill(note);
    await selfCheckIn.click();
    await expect(selfCheckIn).not.toBeChecked();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Workspace settings saved.")).toBeVisible();

    await page.reload();
    await expect(selfCheckIn).not.toBeChecked();
    await expect(footer).toHaveValue(note);

    await page.goto("/payments");
    await page.getByRole("link", { name: "Receipt" }).first().click();
    await expect(page.getByText(note, { exact: true })).toBeVisible();

    await page.goto("/attendance");
    const checkInUrl = await page.locator("[data-checkin-url]").getAttribute("data-checkin-url");
    expect(checkInUrl).toBeTruthy();

    await page.context().clearCookies();
    await signIn(page, "kabir.shah@example.com");
    await page.goto(new URL(checkInUrl!).pathname + new URL(checkInUrl!).search);
    await expect(page.getByText("Self check-in is paused", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm check-in" })).toHaveCount(0);

    // Restore the seeded workspace values so reruns and later checks stay deterministic.
    await page.context().clearCookies();
    await signIn(page, "owner@fitos.app");
    await page.goto("/settings");
    await selfCheckIn.click();
    await footer.fill("");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Workspace settings saved.")).toBeVisible();
    await page.reload();
    await expect(selfCheckIn).toBeChecked();
    await expect(footer).toHaveValue("");
  });
});
