# ArtStage / MyAfriart — Production Build v4 (Ship-Complete + Compliance)

## What's new in v4

| Area | Implementation |
|------|----------------|
| **KYC / identity verification** | `/verification` — NIN, passport, driver's licence, voter's card; private `kyc` bucket; magic-byte doc validation; admin review queue with 10-min signed URLs |
| **KYC enforcement** | Collateral pledging hard-gated on verified identity; escrow ≥ ₦500,000 (tunable via `app_settings.kyc_required_escrow_ngn`) requires verification |
| **Member disputes** | `/disputes` — open a dispute on any completed payment; opening freezes attached escrow |
| **Dispute resolution** | Admin queue with atomic `resolve_payment_dispute` RPC — refund escrow + mark payment refunded in one transaction; rejected disputes restore the hold |
| **Lint** | 255 → ~140 issues; fixed conditional hook call and async promise executor bugs |

## What's new in v3

| Area | Implementation |
|------|----------------|
| **Paystack webhooks** | `POST /api/webhooks/paystack` — HMAC verify + idempotent `payment_webhook_events` |
| **Payment fulfillment** | `fulfill_payment_record` RPC — artwork sale, auction winner, escrow holds |
| **Auction cron** | `GET /api/cron/auctions` — `settle_expired_auction_lots` + 72h payment deadline |
| **Escrow** | Lounge thread “Pay via escrow” → `escrow_holds` table; admin release |
| **Certificates** | `certificate_registry` + public `/verify/cert/$code` |
| **Provenance** | `provenance_events` on successful artwork payment |
| **Collateral liens** | `artworks.is_pledged` set/cleared on pledge status changes |
| **Content Studio** | Persists to `app_settings.site_content` (not localStorage) |
| **Rate limiting** | API routes — 120 req/min per IP |
| **Tests** | `vitest` — auction engine unit tests |
| **Audit** | `npm run audit:aggressive` — hostile gate + build |

## Migrations

```bash
supabase db push
# 20260716000000_production_hardening.sql
# 20260716000001_ship_complete.sql
# 20260716000002_kyc_disputes.sql
```

## Env (server runtime)

```bash
PAYSTACK_SECRET_KEY=sk_live_...
PUBLIC_APP_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=long_random_secret   # for /api/cron/auctions
```

Without Paystack, payments use `/checkout/mock` for demo.

## Verify & audit

```bash
npm install
npm run test                  # unit tests
npm run verify:production     # file/structure checks
npm run build
npm run audit:aggressive      # full hostile audit + build gate
npm start
```

## Staging package

```bash
npm run package:staging
# → ../artstage-8-staging-package.zip
```

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Browse catalogue |
| `/piece/$code` | Detail + Buy now / Lounge / Collateral |
| `/auction` | Live timed auction (persisted) |
| `/lounge` | Private listings, escrow, brokerage |
| `/collateral` | Pledge art as collateral |
| `/verify/cert/$code` | Public certificate verification |
| `/verification` | Member KYC submission |
| `/disputes` | Member payments & dispute filing |
| `/admin` → brokerage | Cert workflow + verify codes |
| `/admin` → collateral | Approve pledges, lien registry |
| `/admin` → kyc | Identity review queue (signed-URL docs) |
| `/admin` → disputes | Dispute resolution + escrow refunds |
| `POST /api/webhooks/paystack` | Paystack charge.success |
| `GET /api/cron/auctions` | Scheduled settlement (Bearer CRON_SECRET) |

## Cron setup (production)

Schedule every 5 minutes:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/auctions
```

## Deploy

See `DEPLOY_AWS.md`, `EC2-DEPLOY.md`, `BUILD-STATUS.md`.

## Audit scorecard (v3 target)

| Category | Status |
|----------|--------|
| Money/trust | Webhooks, escrow, auction deadlines |
| Provenance | Events + public cert verify |
| Collateral | Lien flags on artworks |
| Hardening | Rate limits, tests, server content |
| Ops | Cron route, staging zip, aggressive audit |

**Before live:** run migration, set all env vars, configure Paystack webhook URL to `/api/webhooks/paystack`, schedule auction cron.

## Mobile smoke pass (required before every release)

The aggressive audit now runs Playwright e2e (`npm run test:e2e`) at 390px and
desktop. That suite asserts:

1. Landing loads at the top — hero headline visible, no auto-scroll into the catalogue
2. Country filter option labels have nonzero width (not bare checkboxes)
3. Country → Nigeria → Apply narrows results
4. No horizontal scrollbar at 390px
5. Primary links (/login, /lounge, /studio|/login, /auction, /collateral, …) load correct content
6. Mock catalogue cards deep-link to `/piece/PCE-M…` and `/artist/ART-M…` with matching titles
7. Footer Privacy / FAQ / Contact sheets open

Manual pass on a real phone remains useful for touch feel; the gate itself is automated.

```bash
npm run test:links          # fetch every primary route + mock deep-links (no Chrome needed)
npm run test:e2e            # full Playwright mobile + desktop suite (needs Chrome)
npm run test:e2e:mobile     # iPhone-390 project only
```

The aggressive audit always runs `test:links` as a hard gate. Playwright is also
attempted; if Chrome is blocked by the environment sandbox it WARNs rather than
FAILS (so CI/local unsandboxed runs still catch viewport regressions).
