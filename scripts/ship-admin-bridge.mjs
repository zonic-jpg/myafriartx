#!/usr/bin/env node
/**
 * Production ship: website files + Netlify functions (admin-bridge, stage-room).
 * `npm run ship` and leftover digest commands all go through this script.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PUBLISH = join(ROOT, "dist/client");
const FUNCTIONS_DIR = join(ROOT, "netlify/functions");
const SITE_ID = process.env.NETLIFY_SITE_ID || "7717c70f-3e72-444c-b7c0-9d96f705f60c";

function token() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  const cfg = JSON.parse(readFileSync(join(homedir(), "Library/Preferences/netlify/config.json"), "utf8"));
  return cfg.users[cfg.userId].auth.token;
}

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, base));
    else out.push("/" + relative(base, p).split("\\").join("/"));
  }
  return out;
}

function sha1File(path) {
  return createHash("sha1").update(readFileSync(path)).digest("hex");
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function bundleFunction(name) {
  const src = join(FUNCTIONS_DIR, `${name}.mjs`);
  const work = mkdtempSync(join(tmpdir(), `mafx-${name}-`));
  const outfile = join(work, `${name}.js`);
  execSync(
    `npx --yes esbuild ${JSON.stringify(src)} --bundle --platform=node --format=cjs --outfile=${JSON.stringify(outfile)}`,
    { cwd: ROOT, stdio: "inherit" },
  );
  const zipPath = join(work, `${name}.zip`);
  execSync(`zip -j ${JSON.stringify(zipPath)} ${JSON.stringify(outfile)}`, { stdio: "inherit" });
  const zip = readFileSync(zipPath);
  return { name, zip, hash: sha256(zip) };
}

async function main() {
  if (!existsSync(join(PUBLISH, "index.html"))) {
    throw new Error("dist/client/index.html missing — build the SPA first (vite.config.live-root.ts + prepare-netlify-client).");
  }
  const auth = token();
  const files = Object.fromEntries(walk(PUBLISH).map((rel) => [rel, sha1File(join(PUBLISH, rel.slice(1)))]));
  const bundled = ["admin-bridge", "stage-room"].map(bundleFunction);
  const functions = Object.fromEntries(bundled.map((f) => [f.name, f.hash]));

  const create = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ files, functions }),
  });
  const deploy = await create.json();
  if (!create.ok) throw new Error(`create deploy failed: ${create.status} ${JSON.stringify(deploy)}`);
  console.log("deploy", deploy.id, "required_files", (deploy.required || []).length, "required_functions", (deploy.required_functions || []).length);

  const hashToPath = Object.fromEntries(Object.entries(files).map(([p, h]) => [h, p]));
  for (const hash of deploy.required || []) {
    const rel = hashToPath[hash];
    if (!rel) throw new Error(`missing path for hash ${hash}`);
    const put = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files${rel}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/octet-stream" },
      body: readFileSync(join(PUBLISH, rel.slice(1))),
    });
    if (!put.ok) throw new Error(`upload ${rel} failed: ${put.status} ${await put.text()}`);
    console.log("uploaded", rel);
  }

  for (const fn of bundled) {
    const put = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/functions/${fn.name}?runtime=js`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/octet-stream" },
      body: fn.zip,
    });
    if (!put.ok) throw new Error(`upload function ${fn.name} failed: ${put.status} ${await put.text()}`);
    console.log("uploaded function", fn.name);
  }

  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}`, {
      headers: { Authorization: `Bearer ${auth}` },
    }).then((r) => r.json());
    console.log("state", st.state, st.error_message || "", st.deploy_ssl_url || st.ssl_url || "");
    if (st.state === "ready") {
      writeFileSync("/tmp/myafriartx-admin-bridge-deploy.json", JSON.stringify({ id: st.id, url: st.ssl_url || st.deploy_ssl_url }, null, 2));
      console.log("LIVE", st.ssl_url || st.deploy_ssl_url);
      process.exit(0);
    }
    if (st.state === "error") throw new Error(st.error_message || "deploy error");
  }
  throw new Error("deploy timeout");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
