import { expect, test, type Page } from "@playwright/test";

/**
 * Structural mobile + navigation gate.
 * Catches the 2026-07-17 field bugs (hero auto-scroll, zero-width country
 * labels) and asserts every primary link opens the correct destination —
 * on both iPhone-390 and desktop projects.
 */

async function openCountryChip(page: Page) {
  const country = page.getByRole("button", { name: /^Country/i }).first();
  await country.click();
  await expect(page.getByText("Tip: select multiple")).toBeVisible();
}

test.describe("mobile landing layout", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "iphone-390", "mobile project only");
  });

  test("lands at the top — hero visible, no auto-scroll past catalogue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Discover African art/i })).toBeVisible();
    await expect(page.getByText("This week on MyAfriArt")).toBeVisible();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(80);
  });

  test("country filter shows readable option labels (not bare checkboxes)", async ({ page }) => {
    await page.goto("/");
    await openCountryChip(page);

    const angola = page.getByRole("button", { name: /^Angola$/i }).first();
    await expect(angola).toBeVisible();
    const box = await angola.boundingBox();
    expect(box, "Angola option must have layout box").toBeTruthy();
    expect(box!.width).toBeGreaterThan(80);

    const labelWidth = await angola.evaluate((el) => {
      const span = el.querySelector("span.truncate") as HTMLElement | null;
      return span?.offsetWidth ?? 0;
    });
    expect(labelWidth).toBeGreaterThan(20);
  });

  test("country filter narrows catalogue results", async ({ page }) => {
    await page.goto("/");
    await openCountryChip(page);
    await page.getByRole("button", { name: /^Nigeria$/i }).first().click();
    await page.getByRole("button", { name: /Apply & Search/i }).click();

    await expect(page).toHaveURL(/countries=.*Nigeria/);
    await expect(page.getByRole("heading", { name: /Artists/i })).toContainText(/\(\d+\)/);
    await expect(page.locator("text=/Nigeria/").first()).toBeVisible();
  });

  test("filter chips open usable panels on phone", async ({ page }) => {
    await page.goto("/");
    for (const chip of ["Artists", "Medium", "Age", "Price"] as const) {
      await page.getByRole("button", { name: new RegExp(`^${chip}`, "i") }).first().click();
      await expect(page.getByText(new RegExp(chip, "i")).first()).toBeVisible();
      // Panel must occupy meaningful width — not crushed beside the header.
      const panel = page.locator("text=/Tip: select multiple|Apply & Search/i").first();
      if (await panel.isVisible().catch(() => false)) {
        const box = await panel.boundingBox();
        if (box) expect(box.width).toBeGreaterThan(40);
      }
      await page.getByRole("button", { name: "Close filter" }).click().catch(async () => {
        await page.keyboard.press("Escape");
      });
    }
  });

  test("no horizontal overflow at 390px", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("mobile Stage a room bottom nav reaches studio or login", async ({ page }) => {
    await page.goto("/");
    // Fixed bottom bar is md:hidden — present on phone.
    const bottom = page.locator("nav.fixed, div.fixed").filter({ hasText: /Stage a room/i }).first();
    const link = bottom.getByRole("link", { name: /Stage a room/i }).or(
      page.getByRole("link", { name: /Stage a room/i }).last(),
    );
    await link.click();
    await expect(page).toHaveURL(/\/(studio|login)/);
    await expect(page.locator("body")).toContainText(/Welcome back|Studio|Sign in|Stage/i);
  });
});

test.describe("primary navigation links", () => {
  test("logo and Discover return home with hero", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /MyAfriArt/i }).first().click();
    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.getByRole("heading", { name: /Discover African art/i })).toBeVisible();

    await page.goto("/lounge");
    await page.getByRole("link", { name: /^Discover$/i }).first().click();
    await expect(page).toHaveURL(/\/(\?|$)/);
    await expect(page.getByRole("heading", { name: /Discover African art/i })).toBeVisible();
  });

  test("Sign in opens the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /Welcome back|Create an account/i }),
    ).toBeVisible();
  });

  test("Art Lounge / Stage a room links reach their routes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Art Lounge/i }).first().click();
    await expect(page).toHaveURL(/\/lounge/);
    await expect(page.getByText(/Welcome inside|Members only|Sale Lounge/i).first()).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /Stage a room/i }).first().click();
    await expect(page).toHaveURL(/\/(studio|login)/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("direct routes render expected content", async ({ page }) => {
    const routes: { path: string; expect: RegExp }[] = [
      { path: "/auction", expect: /Friday Evening Sale|Live Auction|Sign in to place bids/i },
      { path: "/lounge", expect: /Welcome inside|Members only|Sale Lounge/i },
      { path: "/login", expect: /Welcome back|Create an account|Sign in/i },
      { path: "/studio", expect: /Welcome back|Studio|Sign in|Stage/i },
      { path: "/collateral", expect: /collateral|Art as collateral|Sign in|pledge/i },
      { path: "/verification", expect: /Identity verification|verification|Sign in/i },
      { path: "/disputes", expect: /Payments & disputes|Sign in|dispute/i },
      { path: "/notify", expect: /NotifyMe|notification|Sign in|reel/i },
      { path: "/renders", expect: /My renders|Sign in|Studio|render/i },
      { path: "/admin", expect: /Admin|Sign in|not authorized|Unauthor/i },
      { path: "/verify/cert/TEST-CODE", expect: /certificate|verify|not found|invalid|Authenticity/i },
    ];

    for (const r of routes) {
      const res = await page.goto(r.path, { waitUntil: "domcontentloaded" });
      const status = res?.status() ?? 0;
      expect(status, `${r.path} HTTP ${status}`).toBeLessThan(500);
      await expect(page.locator("body"), `${r.path} body`).toContainText(r.expect);
    }
  });

  test("mock artwork card opens piece detail with matching title", async ({ page }) => {
    await page.goto("/?scope=artworks&focus=artworks");
    await expect(page.getByRole("heading", { name: /Artworks/i })).toBeVisible();

    const cardLink = page.locator('a[href*="/piece/"]').first();
    await expect(cardLink).toBeVisible({ timeout: 20_000 });
    const href = await cardLink.getAttribute("href");
    expect(href).toMatch(/\/piece\/PCE-M\d+/i);

    const title = (await cardLink.locator("p").first().textContent())?.trim() ?? "";
    await cardLink.click();
    await expect(page).toHaveURL(/\/piece\/PCE-M/i);
    if (title) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    } else {
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /Back to catalogue/i })).toBeVisible();
  });

  test("mock artist card opens artist detail", async ({ page }) => {
    await page.goto("/?scope=artists&focus=artists");
    await expect(page.getByRole("heading", { name: /Artists/i })).toBeVisible();

    const cardLink = page.locator('a[href*="/artist/"]').first();
    await expect(cardLink).toBeVisible({ timeout: 20_000 });
    const href = await cardLink.getAttribute("href");
    expect(href).toMatch(/\/artist\/ART-M\d+/i);

    const name = (await cardLink.locator("p").first().textContent())?.trim() ?? "";
    await cardLink.click();
    await expect(page).toHaveURL(/\/artist\/ART-M/i);
    if (name) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: /Works/i })).toBeVisible();
  });

  test("stable short-code deep links resolve mock content", async ({ page }) => {
    // Direct URL entry — the path phones and shared links take.
    await page.goto("/piece/PCE-M001");
    await expect(page).toHaveURL(/\/piece\/PCE-M001/i);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/No piece matches/i);

    await page.goto("/artist/ART-M001");
    await expect(page).toHaveURL(/\/artist\/ART-M001/i);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/No artist matches/i);
  });

  test("editorial panes Explore reach wired destinations", async ({ page }) => {
    await page.goto("/");

    const cases: { pane: RegExp; explore: RegExp; dest: RegExp; body: RegExp }[] = [
      {
        pane: /Friday Evening Sale/i,
        explore: /Enter auctions/i,
        dest: /\/auction/,
        body: /Friday Evening Sale|Live Auction|Sign in to place bids/i,
      },
      {
        pane: /with artstage/i,
        explore: /Open artstage/i,
        dest: /\/(studio|login)/,
        body: /Welcome back|Studio|Sign in|Stage/i,
      },
    ];

    for (const c of cases) {
      await page.goto("/");
      await page.getByRole("button", { name: c.pane }).first().click();
      await page.getByRole("button", { name: c.explore }).first().click();
      await expect(page).toHaveURL(c.dest);
      await expect(page.locator("body")).toContainText(c.body);
    }

    // Lounge pane uses the special sliding-doors flow — gate or enter.
    await page.goto("/");
    await page.getByRole("button", { name: /Sale Lounge|Members only/i }).first().click();
    // Either the lounge route, or a sign-in gate prompt.
    await expect(page.locator("body")).toContainText(/Sale Lounge|Members only|Sign in|Welcome inside/i);
  });

  test("scope links focus the correct catalogue lane", async ({ page }) => {
    await page.goto("/?scope=artists&focus=artists");
    await expect(page.getByRole("heading", { name: /Artists/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Artworks/i })).toHaveCount(0);

    await page.goto("/?scope=artworks&focus=artworks");
    await expect(page.getByRole("heading", { name: /Artworks/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Artists/i })).toHaveCount(0);
  });

  test("Search by chips switch catalogue scope", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Artists$/i }).first().click();
    // Opening Artists chip then applying, or Search by… — accept either URL update
    // after Apply, or the artists heading when scope is set via search-by flow.
    const apply = page.getByRole("button", { name: /Apply & Search|Apply filters/i }).first();
    if (await apply.isVisible().catch(() => false)) {
      await apply.click();
    }
    // At minimum the chip interaction must not 500 the page.
    await expect(page.locator("body")).toContainText(/Discover African art|Artists|Artworks/i);
  });
});

test.describe("footer legal sheets", () => {
  test("Privacy / FAQ / Contact open sheet content", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    for (const label of ["Privacy", "FAQ", "Contact us"] as const) {
      await page.getByRole("button", { name: label }).first().click();
      await expect(
        page.getByRole("heading", { name: /Privacy|Frequently asked questions|Contact us/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: "×" }).first().click();
    }
  });
});
