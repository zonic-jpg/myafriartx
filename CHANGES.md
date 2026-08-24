# MyAfriart / ArtStage — finalization changes

## 0. EC2 Node.js server fix (Jun 2026) — FIXED

**Symptom:** the app built fine, but `npm start` exited immediately on EC2 — no server ran.

**Root cause:** TanStack Start (v1.167) emits a Web `fetch` handler as the build output
(`dist/server/server.js` → `const server = { async fetch(req, env, ctx) {…} }; export default`).
That is a serverless/edge-style module, **not** a listening Node server, so running it directly
just defines the handler and exits. Setting `NITRO_PRESET=node-server` did **not** change this —
this version always emits the fetch handler.

**Fix:** added a persistent Node HTTP server wrapper, `server.mjs` (project root), that:

- serves the static client build from `dist/client` (long-cache for hashed `/assets/*`),
- delegates SSR pages + API routes (`/api/chat`, auth, etc.) to the built fetch handler,
  converting Node `req`/`res` ↔ Web `Request`/`Response`,
- listens on `process.env.PORT || 3000`,
- adds `unhandledRejection`/`uncaughtException` guards and graceful `SIGTERM`/`SIGINT`
  shutdown so the EC2 process survives errors and drains cleanly on deploy.

**package.json:** `"build": "vite build"`, `"start": "node server.mjs"`, and the
`build:cloudflare` script removed. No Cloudflare Workers / edge runtime remains.

**Verified:** server starts and logs `running on port 3000`; live responses `307` on `/`
(home redirect) and `200` on `/auction` (SSR) — versus the previous immediate exit. Supabase
auth, the AI gateway, API routes, the TanStack Router frontend and admin/content-studio are
unchanged. See `EC2-DEPLOY.md` for pm2/systemd run instructions.

> Note: the wrapper lives at the project root (`server.mjs`), not inside `dist/`, because
> `dist/` is regenerated on every build — a file placed there would be wiped by `npm run build`.

## 1. Safari landing-image bug — FIXED

Root cause: images sat in `aspect-ratio` boxes (`aspect-square`) without `position: relative`,
with the `<img>` using percentage height (`h-full`). WebKit/Safari does not resolve a
percentage height against an aspect-ratio-derived height, so the image collapsed to zero
height and vanished — while Chrome resolved it. The artwork cards (which used
`relative` + `absolute inset-0`) rendered fine, which is why some images showed and others didn't.

- Fixed the artist lane markup directly (`relative` box + `absolute inset-0` images).
- Added a surgical CSS rule (`src/styles.css`) that applies the same correct pattern to every
  aspect-box image across the app (landing, studio, renders, artist & piece pages, admin),
  scoped to object-fit images via `:has()` so avatars/charts are untouched.

## 2. De-Lovabled

- `src/integrations/lovable/index.ts` → native Supabase OAuth (dropped `@lovable.dev/cloud-auth-js`); same call surface.
- `src/lib/ai-gateway.server.ts` → provider-agnostic gateway. Works with ANY OpenAI-compatible
  endpoint (OpenAI, Groq, OpenRouter, Together, or the legacy Lovable gateway) via env
  `AI_API_URL` / `AI_API_KEY` / `AI_MODEL`.
- `src/routes/api/chat.ts` → uses the agnostic provider + env model, with a graceful fallback
  message when no AI key is configured (never hard-fails).
- `vite.config.ts` → explicit plugins (cloudflare, tsConfigPaths, tailwindcss, tanstackStart, viteReact),
  replacing `@lovable.dev/vite-tanstack-config`.
- Removed `@lovable.dev/*` from `package.json` and the Lovable exclude from `bunfig.toml`.

## 3. Build blocker fixed (server-only imports)

Eight `*.functions.ts` modules statically imported `.server` modules (`client.server` /
`auth-helpers.server` / `render-urls.server`) while also being imported by client routes —
TanStack Start blocks server-only code in the client bundle. Converted those to lazy
dynamic imports inside handlers, so the client bundle is clean and handlers still run
server-side. (This was previously masked by Lovable's bundled build config.)

## 4. Content Studio (admin module)

Added `src/components/content-studio.tsx` and wired it as the first tab in `/admin`:
visual page editor (text per page + live preview), single Publish, add/remove hero image
with automatic Mobile/Tablet/Desktop sizing. Gated by the existing `admin` role.
Persists to localStorage in this build — wire `publish()` to the `app_settings` table for live persistence.

## Verification

- `npx tsc --noEmit` — passes clean.
- `npm run build` — passes; produces the client bundle AND the Cloudflare worker server bundle.
- Not verifiable here: deployment to your live Cloudflare/Supabase (needs your keys/project).

## Env to set on deploy

SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
VITE_SUPABASE_PROJECT_ID, PHP_BRIDGE_SECRET, and AI_API_KEY (+ optional AI_API_URL / AI_MODEL).
