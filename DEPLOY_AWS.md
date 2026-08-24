# MyAfriart / ArtStage — AWS deployment (Cloudflare removed ✓, build verified ✓)

TanStack Start (React 19 SSR). Cloudflare has been fully removed:

- `@cloudflare/vite-plugin` deleted from the Vite config and dependencies
- `wrangler.jsonc`, `.wrangler/`, and the Workers server bundle removed
- Cloudflare R2 preview-image URLs replaced with a local asset
- Build now targets a **Node server** (verified: `npm run build` → exit 0)

## Build & run

```bash
npm install
npm run build           # = NITRO_PRESET=node-server vite build  -> dist/
npm start               # = node server.mjs  (persistent Node HTTP server on PORT||3000)
```

`npm run build:cloudflare` is kept only as an optional fallback; the default is Node/AWS.

## Host on AWS (pick one)

- **AWS App Runner** — point at the repo, build `npm run build`, run `npm start`, port 3000. Simplest.
- **Elastic Beanstalk (Node platform)** — deploy the repo; run command `npm start`.
- **ECS/Fargate** — containerise (`node:20-slim`, `npm ci && npm run build`, CMD `npm start`).
- **EC2 (Node.js)** — `npm install && npm run build && npm start`; keep alive with pm2 or a systemd unit behind an ALB/Nginx. See **EC2-DEPLOY.md**.
- Static client (`dist/client`) can also sit on S3+CloudFront with the Node server behind it.

## Virtual feature (AI room-staging) — now provider-agnostic / AWS-ready

`src/lib/stage-room.functions.ts` no longer hardcodes Lovable. Configure via env:

- `AI_API_URL` (any OpenAI-compatible image endpoint; e.g. your AWS-hosted gateway)
- `AI_API_KEY`
- `AI_IMAGE_MODEL` (default `google/gemini-3-pro-image-preview`)
  `LOVABLE_API_KEY` still works as a fallback if you prefer.

## Env

SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE, AI_API_URL/AI_API_KEY/AI_IMAGE_MODEL,
PHP_BRIDGE_SECRET (if using the PHP bridge).
