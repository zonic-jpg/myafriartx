#!/usr/bin/env node
/** Copy SPA shell + redirects into dist/client after vite.config.netlify.ts build. */
import { copyFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const client = join(root, "dist/client");
const shell = join(client, "_shell.html");

if (!existsSync(shell)) {
  console.error("Missing dist/client/_shell.html — run: npx vite build --config vite.config.netlify.ts");
  process.exit(1);
}

for (const name of ["index.html", "404.html", "_shell.html"]) {
  copyFileSync(shell, join(client, name));
  console.log("OK ", name);
}

// REGRESSION FIX (2026-09-06): this used to write ONLY the SPA catch-all,
// silently deleting the /api/* -> functions mapping (and the /auth alias)
// on every manual ship -- admin-bridge (catalogue, submissions, letters,
// events, everything) 404'd in production whenever this ran after a deploy
// that didn't already have those rules cached from an earlier build. These
// must mirror netlify.toml's [[redirects]] exactly -- that file is the
// source of truth; update both together.
writeFileSync(
  join(client, "_redirects"),
  [
    "/auth    /login   302",
    "/auth/*  /login   302",
    "/api/stage-room   /.netlify/functions/stage-room   200",
    "/api/stage-room/  /.netlify/functions/stage-room   200",
    "/api/*   /.netlify/functions/:splat   200",
    "/*       /index.html   200",
    "",
  ].join("\n"),
);
console.log("OK  _redirects");
console.log("Netlify client ready:", client);
