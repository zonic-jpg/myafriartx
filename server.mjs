// Node.js HTTP server for AWS EC2 / App Runner / ECS / Elastic Beanstalk.
//
// The TanStack Start build emits a Web `fetch(request)` handler at
// dist/server/server.js — that is NOT a listening server. This file wraps that
// handler in a persistent Node http server: it serves the static client build
// from dist/client, then delegates everything else (SSR pages + API routes) to
// the fetch handler, converting Node req/res <-> Web Request/Response.
//
// Start with:  node server.mjs   (PORT defaults to 3000)

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env into process.env at runtime. Vite only injects env at BUILD time
// (for VITE_* browser vars); a production Node server does not auto-load .env,
// so server functions (Supabase admin, AI gateway) would otherwise see no env
// and throw "Missing Supabase environment variable(s)". Real platform/OS env
// vars take precedence (we never overwrite an already-set variable), so this is
// safe on AWS where you set env via the service config instead of a .env file.
async function loadDotEnv() {
  try {
    const text = await readFile(path.join(__dirname, ".env"), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    // No .env file — rely on the real environment (the normal case on AWS).
  }
}
await loadDotEnv();

const CLIENT_DIR = path.join(__dirname, "dist", "client");
const PORT = Number(process.env.PORT) || 3000;

// Load the built SSR fetch handler (default export with `.fetch`).
const mod = await import(path.join(__dirname, "dist", "server", "server.js"));
const serverEntry = mod.default ?? mod.server ?? mod;

const MIME = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain",
};

// Try to serve a static file from dist/client. Returns true if served.
async function serveStatic(reqPath, res) {
  // never allow path traversal
  const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(CLIENT_DIR, safe);
  if (!filePath.startsWith(CLIENT_DIR)) return false;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    // hashed asset files are immutable; cache them hard
    if (safe.startsWith("/assets/") || safe.startsWith("assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    res.setHeader("Content-Length", s.size);
    await new Promise((resolve, reject) =>
      createReadStream(filePath).on("error", reject).on("end", resolve).pipe(res),
    );
    return true;
  } catch {
    return false;
  }
}

// Build a Web Request from a Node IncomingMessage.
function toWebRequest(req) {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `http://${host}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
    else if (v != null) headers.set(k, v);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

// Stream a Web Response back to the Node ServerResponse.
async function writeWebResponse(res, webRes) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  if (!webRes.body) return res.end();
  const reader = webRes.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    // 1) static assets first (only for safe GET/HEAD)
    if (req.method === "GET" || req.method === "HEAD") {
      const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
      if (pathname !== "/" && (await serveStatic(pathname, res))) return;
    }
    // 2) everything else -> SSR + API via the fetch handler
    const webReq = toWebRequest(req);
    const webRes = await serverEntry.fetch(webReq, process.env, {});
    await writeWebResponse(res, webRes);
  } catch (err) {
    console.error("Server error:", err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`MyAfriArt / ArtStage server running on port ${PORT}`);
});

// Keep the EC2 process alive through unexpected errors instead of crashing out.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
// Graceful shutdown (so load balancers drain cleanly on deploy/restart).
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
  });
}
