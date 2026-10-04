import { expect, type Page, test } from "@playwright/test";

/**
 * These tests need a real Supabase connection (auth calls, admin access
 * verification) to mean anything. An environment with no VITE_SUPABASE_URL /
 * VITE_SUPABASE_PUBLISHABLE_KEY configured — e.g. a sandbox with no .env and
 * no network egress to *.supabase.co — logs a specific console warning and
 * then every backend call is a no-op. Skip cleanly there instead of
 * false-failing; on the real dev machine / CI (with the secrets set) these
 * run for real.
 */
async function skipIfSupabaseUnconfigured(page: Page, path: string) {
  let unconfigured = false;
  const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
    if (/\[Supabase\] Missing environment variable/i.test(msg.text())) unconfigured = true;
  };
  page.on("console", onConsole);
  await page.goto(path);
  await page.waitForTimeout(2000);
  page.off("console", onConsole);
  test.skip(unconfigured, "Supabase is not configured in this environment (no VITE_SUPABASE_* env)");
}

/**
 * Guardrail #2 — E2E coverage for the exact flows that broke in production
 * this cycle: sign-in, admin access, and bidding. These deliberately
 * avoid writing any real state to the live Supabase project (no real account
 * is created, no admin session is granted, no bid is placed) — they assert
 * the client-side contract that must hold no matter what the backend does,
 * so they're safe to run against the real dev server/live DB in CI.
 *
 * Authorisation rules (verified owner / admin role only, no shared password) are
 * covered at the unit level in tests/admin-bridge-auth.test.ts and
 * tests/signup-approvals.test.ts.
 */

test.describe("sign-in (/login)", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Welcome back|Create an account/i })).toBeVisible();
    await expect(page.getByPlaceholder("oadeagbo@gmail.com")).toBeVisible();
  });

  test("wrong credentials show a friendly error, not a raw Supabase error", async ({ page }) => {
    await skipIfSupabaseUnconfigured(page, "/login");
    // Real keystrokes, not .fill() — the page deliberately scrubs any field
    // value that didn't arrive via a genuine keydown/paste (anti-autofill
    // guard for throwaway QA identities), so a CDP-set value gets wiped
    // before submit. pressSequentially fires real key events like a user.
    await page.getByPlaceholder("oadeagbo@gmail.com").pressSequentially(
      "e2e-guardrail-nonexistent@myafriart.invalid",
      { delay: 10 },
    );
    await page
      .locator('input[name="afriart-secret"]')
      .pressSequentially("definitely-wrong-password-123", { delay: 10 });
    await page.getByRole("button", { name: "Sign in" }).click();

    // Never a raw "Invalid login credentials" / stack trace — always the
    // friendlyAuthError() rewrite, and the user stays on /login (no bad nav).
    await expect(page.getByText(/Wrong email or password|Authentication failed/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("the public login form offers no admin-password path", async ({ page }) => {
    // /login is pure Supabase email/password auth for everyone, owner included.
    await page.goto("/login");
    await expect(page.locator("body")).not.toContainText(/admin password/i);
  });
});

test.describe("admin (/admin)", () => {
  test("signed-out visitors go to normal sign-in and keep the deep link", async ({ page }) => {
    await skipIfSupabaseUnconfigured(page, "/admin?tab=approvals");
    await expect(page).toHaveURL(/\/login\?.*redirect=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get("redirect") ?? "")).toBe(
      "/admin?tab=approvals",
    );
    // No shared-password form, and nothing from the dashboard leaks.
    await expect(page.getByPlaceholder("Admin password")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Catalogue admin" })).toHaveCount(0);
  });
});

test.describe("bidding (/auction)", () => {
  test("signed-out visitors are prompted to sign in and cannot submit a bid", async ({ page }) => {
    await page.goto("/auction");
    await expect(page.getByRole("heading", { name: "Friday Evening Sale" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Sign in/i);

    const lot = page.locator("button.lot").first();
    if (await lot.isVisible().catch(() => false)) {
      await lot.click();
      const bidButton = page.getByRole("button", { name: /place bid/i });
      if (await bidButton.isVisible().catch(() => false)) {
        await bidButton.click();
        // placeAuctionBid's requireSupabaseAuth middleware — and the anon
        // guard added to the place_bid RPC — must never let this through.
        await expect(page.getByText(/Sign in to bid/i)).toBeVisible();
      }
    }
  });
});
