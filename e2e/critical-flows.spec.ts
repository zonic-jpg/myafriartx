import { expect, type Page, test } from "@playwright/test";

/**
 * These tests need a real Supabase connection (auth calls, admin gate
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
 * this cycle: sign-in, the admin orbit gate, and bidding. These deliberately
 * avoid writing any real state to the live Supabase project (no real account
 * is created, no admin session is granted, no bid is placed) — they assert
 * the client-side contract that must hold no matter what the backend does,
 * so they're safe to run against the real dev server/live DB in CI.
 *
 * The actual regression already found and fixed this cycle (the fake
 * "tester-verify@example.com" pending row reappearing in the approval queue)
 * is covered at the unit level instead, in tests/admin-bridge-access-list.test.ts
 * and tests/admin-tester-approval-queue.test.ts — reproducing it end-to-end
 * would mean creating and deciding on a real row in the production
 * admin_access_requests table on every CI run, which is exactly the kind of
 * test-data pollution this project is trying to stop shipping.
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

  test("the admin gate is not reachable from the public login form", async ({ page }) => {
    // Regression guard for the routing bug this session fixed: /login must
    // stay pure Supabase email/password auth and never surface or accept the
    // shared orbit admin password as an alternate path.
    await page.goto("/login");
    await expect(page.locator("body")).not.toContainText(/admin password/i);
  });
});

test.describe("admin orbit gate (/admin)", () => {
  test("wrong admin password is rejected without granting access", async ({ page }) => {
    await skipIfSupabaseUnconfigured(page, "/admin");
    const identity = page.getByPlaceholder("Email or username");
    const password = page.getByPlaceholder("Admin password");

    // If a real Supabase admin session exists in this browser context (CI has
    // none), the gate form isn't shown at all — skip rather than false-fail.
    if (!(await identity.isVisible().catch(() => false))) {
      test.skip(true, "already authenticated as admin in this browser context");
    }

    await identity.fill("e2e-guardrail@myafriart.invalid");
    await password.fill("not-the-real-password");
    await page.getByRole("button", { name: "Enter" }).click();

    await expect(page.getByText(/Incorrect admin password/i)).toBeVisible();
    // Must still be on the gate form, not inside the admin dashboard.
    await expect(page.getByRole("heading", { name: "Pending approvals" })).toHaveCount(0);
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
