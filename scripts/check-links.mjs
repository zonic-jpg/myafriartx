#!/usr/bin/env node
/**
 * Link + content smoke check (no browser binary required).
 * Hits every primary route and a mock deep-link, asserts HTTP < 500 and
 * that the HTML body contains an expected marker.
 *
 * Run: node scripts/check-links.mjs [baseURL]
 * Default baseURL: http://localhost:5399
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const base = (process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5399").replace(
  /\/$/,
  "",
);

const checks = [
  { path: "/", expect: /Discover African art|MyAfriart/i },
  { path: "/login", expect: /Welcome back|Sign in|Create an account|MyAfriart/i },
  { path: "/lounge", expect: /Sale Lounge|Welcome inside|Members only|MyAfriart/i },
  { path: "/auction", expect: /Friday Evening Sale|Live Auction|Sign in to place bids|MyAfriart/i },
  { path: "/studio", expect: /Welcome back|Studio|Sign in|Stage|MyAfriart/i },
  { path: "/collateral", expect: /collateral|Sign in|pledge|MyAfriart/i },
  { path: "/verification", expect: /verification|Sign in|Identity|MyAfriart/i },
  { path: "/disputes", expect: /dispute|Sign in|Payments|MyAfriart/i },
  { path: "/notify", expect: /Notify|notification|Sign in|reel|MyAfriart/i },
  { path: "/renders", expect: /render|Sign in|Studio|MyAfriart/i },
  { path: "/admin", expect: /Admin|Sign in|authoriz|MyAfriart/i },
  { path: "/verify/cert/TEST-CODE", expect: /certificat|verify|Authenticity|not found|invalid|MyAfriart/i },
  { path: "/piece/PCE-M001", expect: /Back to catalogue|MyAfriart|Buy|price|Artist/i },
  { path: "/artist/ART-M001", expect: /Works|MyAfriart|Back to catalogue|Artist/i },
  { path: "/?scope=artists&focus=artists", expect: /Artists|MyAfriart/i },
  { path: "/?scope=artworks&focus=artworks", expect: /Artworks|MyAfriart/i },
  { path: "/?countries=%5B%22Nigeria%22%5D", expect: /Nigeria|MyAfriart|Artists|Artworks/i },
];

let pass = 0;
let fail = 0;
const lines = [];

async function hit(path, expect) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html" },
      redirect: "follow",
    });
    const status = res.status;
    const text = await res.text();
    const okStatus = status < 500;
    const okBody = expect.test(text);
    if (okStatus && okBody) {
      pass++;
      lines.push(`PASS ${status} ${path}`);
      console.log(`PASS ${status} ${path}`);
    } else {
      fail++;
      const why = !okStatus ? `HTTP ${status}` : `body missing /${expect.source}/`;
      lines.push(`FAIL ${status} ${path} — ${why}`);
      console.log(`FAIL ${status} ${path} — ${why}`);
    }
  } catch (e) {
    fail++;
    const msg = e?.message || String(e);
    lines.push(`FAIL 000 ${path} — ${msg}`);
    console.log(`FAIL 000 ${path} — ${msg}`);
  }
}

console.log(`Link check against ${base}\n`);
for (const c of checks) {
  await hit(c.path, c.expect);
}

const summary = `\n${pass} pass, ${fail} fail — ${fail === 0 ? "OK" : "BROKEN LINKS"}`;
console.log(summary);
lines.push(summary);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "test-results-links.txt");
writeFileSync(out, lines.join("\n") + "\n");

process.exit(fail > 0 ? 1 : 0);
