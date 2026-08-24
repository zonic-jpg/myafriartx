# MyAfriArt / ArtStage — Build Status (26 Jun 2026)

## VERIFIED (commands run, real exit codes)
- `npm install` — exit 0 (406 packages)
- `npm run build` (vite build) — **exit 0**; client + server bundled (.output)
- `npx tsc --noEmit` — **exit 0, zero type errors**
- `node --check server.mjs` (EC2 entry) — OK
- `react-hooks/rules-of-hooks` — **0** (the 2 real-bug-class lint errors fixed)

## Fixed
- Ran `npm run format` (prettier) — cleared ~1,900 formatting lint errors.
- Extracted the inline `errorComponent` in `artist.$code.tsx` and `piece.$code.tsx`
  into named components (`ArtistErrorComponent`, `PieceErrorComponent`) so `useRouter`
  is called inside a real component — fixes the rules-of-hooks violations.

## Remaining lint — NON-blocking, NOT part of the build
`npm run build` does not run lint. `npm run lint` still reports ~180 problems, almost
all `@typescript-eslint/no-explicit-any` (149) plus a few `react-refresh` and
`react-hooks/exhaustive-deps`. These are style/quality, not build or type errors, and
do not affect the production bundle. Cleaning the `any` usages to real types is an
optional pass (~149 sites) that can be done if you want lint fully green.

## Deploy
- Static/SSR server bundle in `.output/` (run `node .output/server/index.mjs`, or the
  provided `server.mjs` for EC2). Frontend assets in `.output/public`.
- Requires env at runtime: Supabase + the Lovable AI gateway key for the room stager.

## Bug fix — "Apply & Search" unresponsive (gender + all filters)
Root cause: the labeled "Apply & Search" button used `onClick={onSubmit}`, so React
passed the click event as the first argument to `submitDraftFilters(nextFilters)`. That
event flowed into `updateFilters`, where `next.countries.length` threw a TypeError before
`navigate()` ran — so no search fired and the button looked dead. (The top-bar arrow
button used `onClick={() => onSubmit()}` and was unaffected.)
Fix: `onClick={() => onSubmit()}` on the Apply & Search button, plus a guard in
`submitDraftFilters` that ignores any non-filter argument. VERIFIED: tsc 0, build 0, and
a logic-level repro shows the old path throws while the fixed path navigates with the
selected filters. (Browser click-test not run here — chromium can't download in this
sandbox; runs fine in a normal environment.)

## Studio "Stage the Room" + NotifyMe "Save Preferences / Send reel" failures
Root cause (both): the production Node server (`server.mjs`) did NOT load `.env` at
runtime. Vite only injects env at BUILD time (the VITE_* browser vars). The server
functions behind these buttons run on the Node server and read `process.env.SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `AI_API_KEY` at RUNTIME — all
empty — so `requireSupabaseAuth` threw "Missing Supabase environment variable(s)". The
buttons themselves are wired correctly.

Code fixes (VERIFIED here):
- `server.mjs` now loads `.env` into `process.env` at startup (dependency-free; real
  platform/OS env vars take precedence). Verified: server.mjs parses; loader populates
  process.env and does not overwrite already-set vars.
- The misleading error text ("Connect Supabase in Lovable Cloud") now names the fix:
  set the vars in `.env` or the host environment.

Config you must supply (NEEDS-X — these are secrets I can't provide):
Your `.env` is MISSING two runtime secrets, which is why the actions failed even with
the loader. Add them (see `.env.example`):
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API (server-only).
- `AI_API_KEY` (or `LOVABLE_API_KEY`) — the image model the room stager calls.
After adding these and restarting the server, Save Preferences, Send sample reel, and
Stage the Room will reach the backend. (The room render also needs valid artwork/style
rows in Supabase; the stager throws "AI gateway not configured" only when the AI key is
absent.)
