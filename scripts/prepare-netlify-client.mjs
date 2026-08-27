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

writeFileSync(join(client, "_redirects"), "/*    /index.html   200\n");
console.log("OK  _redirects");
console.log("Netlify client ready:", client);
