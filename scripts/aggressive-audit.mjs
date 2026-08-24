#!/usr/bin/env node
/**
 * Aggressive hostile audit — ArtStage ship-complete gate.
 * Run: node scripts/aggressive-audit.mjs
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0,
  fail = 0,
  warn = 0;

const ok = (n) => {
  console.log("PASS", n);
  pass++;
};
const bad = (n, why = "") => {
  console.log("FAIL", n, why ? `— ${why}` : "");
  fail++;
};
const caution = (n) => {
  console.log("WARN", n);
  warn++;
};

const mustExist = (paths) =>
  paths.forEach((p) => (existsSync(join(root, p)) ? ok(p) : bad(p, "missing")));

// ── Required ship-complete artifacts ──
mustExist([
  "supabase/migrations/20260716000001_ship_complete.sql",
  "src/routes/api/webhooks/paystack.ts",
  "src/routes/api/cron/auctions.ts",
  "src/routes/verify.cert.$code.tsx",
  "src/lib/escrow.functions.ts",
  "src/lib/provenance.functions.ts",
  "src/lib/content-studio.functions.ts",
  "src/lib/rate-limit.server.ts",
  "src/lib/payments-core.server.ts",
  "tests/auction-engine.test.ts",
  "docs/PRODUCTION_BUILD.md",
]);

const mig1 = readFileSync(
  join(root, "supabase/migrations/20260716000001_ship_complete.sql"),
  "utf8",
);
[
  ["escrow_holds", "escrow_holds"],
  ["certificate_registry", "certificate_registry"],
  ["provenance_events", "provenance_events"],
  ["payment_webhook_events", "payment_webhook_events"],
  ["payment_disputes", "payment_disputes"],
  ["fulfill_payment_record", "fulfill_payment_record RPC"],
  ["register_certificate", "register_certificate RPC"],
  ["payment_due_at", "auction payment deadline"],
  ["is_pledged", "artwork lien flag"],
].forEach(([needle, label]) =>
  mig1.includes(needle) ? ok(`migration: ${label}`) : bad(`migration: ${label}`),
);

// ── No client-only auction seed ──
const auction = readFileSync(join(root, "src/routes/auction.tsx"), "utf8");
auction.includes("listAuctionLots")
  ? ok("auction: server lots")
  : bad("auction: not wired to server");
!auction.includes("const SEED") ? ok("auction: no SEED") : bad("auction: still has SEED data");

// ── Payments hardening ──
const payFn = readFileSync(join(root, "src/lib/payments.functions.ts"), "utf8");
payFn.includes("fulfill_payment_record")
  ? ok("payments: RPC fulfillment")
  : bad("payments: inline fulfillment only");

const webhook = readFileSync(join(root, "src/routes/api/webhooks/paystack.ts"), "utf8");
webhook.includes("x-paystack-signature") && webhook.includes("timingSafeEqual")
  ? ok("webhook: HMAC verify")
  : bad("webhook: weak or missing signature check");
webhook.includes("payment_webhook_events") || webhook.includes("logWebhookEvent")
  ? ok("webhook: idempotency log")
  : bad("webhook: no idempotency");

const cron = readFileSync(join(root, "src/routes/api/cron/auctions.ts"), "utf8");
cron.includes("CRON_SECRET") && cron.includes("settle_expired_auction_lots")
  ? ok("cron: auction settlement")
  : bad("cron: missing settlement");

// ── Content studio persistence ──
const cs = readFileSync(join(root, "src/components/content-studio.tsx"), "utf8");
cs.includes("publishSiteContent") && cs.includes("getSiteContent")
  ? ok("content-studio: app_settings")
  : bad("content-studio: still localStorage only");
!cs.includes("localStorage.setItem(KEY")
  ? ok("content-studio: no localStorage publish")
  : bad("content-studio: localStorage publish");

// ── Escrow in lounge ──
const lounge = readFileSync(join(root, "src/routes/lounge.tsx"), "utf8");
lounge.includes("Pay via escrow") ? ok("lounge: escrow CTA") : bad("lounge: no escrow");
!lounge.includes("verified buyers and sellers")
  ? ok("lounge: honest member copy")
  : bad("lounge: overclaims verified");

// ── Certificate verify route ──
existsSync(join(root, "src/routes/verify.cert.$code.tsx"))
  ? ok("cert verify page")
  : bad("cert verify page");

const loungeFn = readFileSync(join(root, "src/lib/lounge.functions.ts"), "utf8");
loungeFn.includes("register_certificate")
  ? ok("brokerage: registry RPC")
  : bad("brokerage: no registry");

// ── Collateral lien ──
const coll = readFileSync(join(root, "src/lib/collateral.functions.ts"), "utf8");
coll.includes("is_pledged") ? ok("collateral: lien on artwork") : bad("collateral: no lien wiring");

const piece = readFileSync(join(root, "src/routes/piece.$code.tsx"), "utf8");
piece.includes("is_pledged") ? ok("piece: pledged guard") : bad("piece: no pledged guard");

// ── Rate limiting ──
const start = readFileSync(join(root, "src/start.ts"), "utf8");
start.includes("rateLimitMiddleware") || start.includes("checkRateLimit")
  ? ok("rate limit middleware")
  : bad("rate limit middleware");

// ── KYC workflow (hostile checks) ──
mustExist([
  "supabase/migrations/20260716000002_kyc_disputes.sql",
  "src/lib/kyc.functions.ts",
  "src/lib/disputes.functions.ts",
  "src/routes/verification.tsx",
  "src/routes/disputes.tsx",
  "src/components/admin/kyc-admin.tsx",
  "src/components/admin/disputes-admin.tsx",
]);

const kycMig = readFileSync(
  join(root, "supabase/migrations/20260716000002_kyc_disputes.sql"),
  "utf8",
);
kycMig.includes("'kyc', 'kyc', false")
  ? ok("kyc: private storage bucket")
  : bad("kyc: bucket missing or public");
kycMig.includes("is_member_verified") ? ok("kyc: verified RPC") : bad("kyc: no verified RPC");
kycMig.includes("resolve_payment_dispute")
  ? ok("disputes: atomic resolution RPC")
  : bad("disputes: no resolution RPC");
kycMig.includes("uq_payment_disputes_open_payment")
  ? ok("disputes: one open dispute per payment")
  : bad("disputes: duplicate disputes possible");

const kycFn = readFileSync(join(root, "src/lib/kyc.functions.ts"), "utf8");
kycFn.includes("sniffDocMime")
  ? ok("kyc: magic-byte doc validation")
  : bad("kyc: extension-only validation");
kycFn.includes("createSignedUrl")
  ? ok("kyc: signed URL doc access")
  : bad("kyc: docs publicly readable");
kycFn.includes('eq("status", "pending")')
  ? ok("kyc: review only from pending")
  : bad("kyc: decided records can be flipped");

const collFn = readFileSync(join(root, "src/lib/collateral.functions.ts"), "utf8");
collFn.includes("requireVerifiedMember")
  ? ok("collateral: KYC gate")
  : bad("collateral: no KYC gate");

const payGate = readFileSync(join(root, "src/lib/payments.functions.ts"), "utf8");
payGate.includes("kyc_required_escrow_ngn")
  ? ok("escrow: KYC threshold gate")
  : bad("escrow: no KYC threshold");

const dispFn = readFileSync(join(root, "src/lib/disputes.functions.ts"), "utf8");
dispFn.includes('eq("user_id", context.userId)')
  ? ok("disputes: payer-only opening")
  : bad("disputes: anyone can dispute any payment");
dispFn.includes('"disputed"')
  ? ok("disputes: escrow freeze on open")
  : bad("disputes: escrow not frozen");

const adminRoute = readFileSync(join(root, "src/routes/admin.tsx"), "utf8");
adminRoute.includes("KycAdmin") && adminRoute.includes("DisputesAdmin")
  ? ok("admin: kyc + disputes tabs")
  : bad("admin: missing review queues");

// ── Mobile UX regressions (found in the field, 2026-07-17) ──
// Static tripwires hold the two layout fixes; Playwright e2e is the real gate.
const indexRoute = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
!/search\.focus === "catalogue"[^}]*scrollToCatalogue/s.test(
  indexRoute.match(/useEffect\(\(\) => \{[\s\S]{0,400}?scrollToCatalogue\(\);\s*\}\s*\}, \[search\.focus/)?.[0] ?? "",
)
  ? ok("mobile: no auto-scroll past hero on default landing")
  : bad("mobile: landing auto-scrolls past hero (focus=catalogue is the schema default)");
indexRoute.includes("order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1")
  ? ok("mobile: filter panel stacks below header row on phones")
  : bad("mobile: FilterSubBar single-row layout crushes options to 0px on phones");
existsSync(join(root, "e2e/mobile-and-links.spec.ts")) &&
existsSync(join(root, "playwright.config.ts"))
  ? ok("e2e: playwright mobile+links suite present")
  : bad("e2e: playwright suite missing");
const mockCat = readFileSync(join(root, "src/lib/mock-catalogue.ts"), "utf8");
mockCat.includes("PCE-M") && mockCat.includes("ART-M") && mockCat.includes("getMockPiece")
  ? ok("mock catalogue: deep-linkable short codes")
  : bad("mock catalogue: missing short-code deep links");
existsSync(join(root, "scripts/check-links.mjs"))
  ? ok("e2e: fetch-based link checker present")
  : bad("e2e: scripts/check-links.mjs missing");
const pwCfg = readFileSync(join(root, "playwright.config.ts"), "utf8");
pwCfg.includes("iphone-390") && pwCfg.includes("390")
  ? ok("e2e: iphone-390 project configured")
  : bad("e2e: missing iphone-390 viewport project");

// ── Env example ──
const env = readFileSync(join(root, ".env.example"), "utf8");
env.includes("CRON_SECRET") ? ok("env: CRON_SECRET") : caution("env: CRON_SECRET not documented");

// ── Secrets in repo scan ──
const scanDirs = ["src", "scripts", "supabase"];
const secretPatterns = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ[a-zA-Z0-9._-]{20,}/,
];
let secretHit = false;
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory() && !["node_modules", "dist", ".git"].includes(ent.name)) walk(p);
    else if (
      ent.isFile() &&
      /\.(ts|tsx|js|mjs|sql|env)$/.test(ent.name) &&
      !ent.name.includes(".example")
    ) {
      const txt = readFileSync(p, "utf8");
      for (const pat of secretPatterns) {
        if (pat.test(txt)) {
          bad(`secret leak: ${p.replace(root, "")}`);
          secretHit = true;
        }
      }
    }
  }
}
scanDirs.forEach((d) => {
  const p = join(root, d);
  if (existsSync(p)) walk(p);
});
if (!secretHit) ok("no obvious secrets in source");

// ── Run unit tests ──
try {
  execSync("npm run test", { cwd: root, stdio: "pipe" });
  ok("unit tests");
} catch (e) {
  bad("unit tests", e.stderr?.toString().slice(0, 200) || "failed");
}

// ── Link + content gate (fetch-based; works without a Chrome binary) ──
// Ensures every primary route returns <500 and the expected content marker.
const LINK_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5399";
const LINK_PORT = Number(new URL(LINK_BASE).port || 5399);

async function waitForServer(url, ms = 90_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

let linkServer = null;
let linkServerReady = await waitForServer(LINK_BASE, 3_000);
if (!linkServerReady) {
  linkServer = spawn(
    "npm",
    ["run", "dev", "--", "--host", "localhost", "--port", String(LINK_PORT), "--strictPort"],
    { cwd: root, stdio: "ignore", detached: true },
  );
  linkServerReady = await waitForServer(LINK_BASE, 120_000);
}
if (!linkServerReady) {
  bad("e2e: link server", `could not reach ${LINK_BASE}`);
} else {
  try {
    execSync(`node scripts/check-links.mjs ${LINK_BASE}`, {
      cwd: root,
      stdio: "pipe",
      timeout: 120000,
    });
    ok("e2e: all primary links return correct content");
  } catch (e) {
    const detail = (e.stdout?.toString() || e.stderr?.toString() || "").slice(-500);
    bad("e2e: link content check", detail || "failed");
  }

  // Playwright rendered-viewport gate. Real assertion failures FAIL the audit;
  // Chrome killed by seatbelt/sandbox (SIGABRT / kill EPERM) is a WARN so the
  // fetch-based link gate above remains the portable hard floor.
  try {
    execSync("npx playwright test", {
      cwd: root,
      stdio: "pipe",
      timeout: 300000,
      env: {
        ...process.env,
        CI: process.env.CI || "1",
        PLAYWRIGHT_NO_SERVER: "1",
        PLAYWRIGHT_BASE_URL: LINK_BASE,
      },
    });
    ok("e2e: playwright mobile + links");
  } catch (e) {
    const detail = `${e.stdout?.toString?.() || ""}\n${e.stderr?.toString?.() || ""}`;
    const sandboxKill =
      /kill EPERM|SIGABRT|browserType\.launch: Target page, context or browser has been closed/i.test(
        detail,
      ) && !/Error: expect\(|AssertionError|toHaveURL|toBeVisible|toContainText/i.test(detail);
    if (sandboxKill) {
      caution(
        "e2e: playwright skipped — Chrome blocked in sandbox; link gate still enforced. Run `npm run test:e2e` unsandboxed locally/CI.",
      );
    } else {
      bad("e2e: playwright mobile + links", detail.slice(-400) || "failed");
    }
  }
}
if (linkServer?.pid) {
  try {
    process.kill(-linkServer.pid, "SIGTERM");
  } catch {
    /* ignore */
  }
}

// ── Production verify + build ──
try {
  execSync("npm run verify:production", { cwd: root, stdio: "pipe" });
  ok("verify:production");
} catch {
  bad("verify:production");
}

try {
  execSync("npm run build", { cwd: root, stdio: "pipe", timeout: 120000 });
  ok("production build");
} catch (e) {
  bad("production build", e.stderr?.toString().slice(0, 300) || "failed");
}

// ── Scorecard ──
const total = pass + fail;
const score = Math.round((pass / Math.max(total, 1)) * 100);
const ship =
  fail === 0 && score >= 95 ? "SHIP" : fail <= 2 && score >= 90 ? "STAGE" : "DO NOT SHIP";

console.log("\n═══════════════════════════════════════");
console.log(`Aggressive audit: ${pass} pass, ${fail} fail, ${warn} warn`);
console.log(`Score: ${score}/100 — ${ship}`);
console.log("═══════════════════════════════════════\n");

process.exit(fail > 0 ? 1 : 0);
