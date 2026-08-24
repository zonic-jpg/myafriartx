import { defineConfig, devices } from "@playwright/test";

/**
 * Rendered-viewport + navigation gate for ArtStage.
 * Uses the system Google Chrome channel so CI/local don't need a Playwright
 * browser download (sandbox environments often block cdn.playwright.dev).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    // Prefer localhost over 127.0.0.1 — Vite on macOS often binds IPv6-only
    // ::1 (shown as "localhost"), so IPv4 127.0.0.1 never connects.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5399",
    channel: "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "iphone-390",
      use: {
        ...devices["iPhone 12"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: false,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        // --host localhost forces a resolvable bind; --strictPort fails loud
        // if 5399 is taken instead of silently picking another port.
        command: "npm run dev -- --host localhost --port 5399 --strictPort",
        url: "http://localhost:5399",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
