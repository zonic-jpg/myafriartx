# MyAfriArt / ArtStage — AWS EC2 (Node.js) Deployment

The app is a TanStack Start SSR application. Its build emits a Web `fetch` handler
(`dist/server/server.js`), which is NOT a listening server. `server.mjs` wraps that handler
in a persistent Node HTTP server so it runs on EC2.

## Run on EC2

```bash
npm install
npm run build            # vite build -> dist/client (static) + dist/server (SSR handler)
npm start                # node server.mjs -> persistent HTTP server on PORT (default 3000)
```

`server.mjs`:

- serves the static client build from `dist/client` (long-cache for hashed assets),
- delegates SSR pages + API routes (`/api/chat`, auth, etc.) to the built fetch handler,
- listens on `process.env.PORT || 3000`,
- has process-level error handlers + graceful SIGTERM/SIGINT shutdown.

## Keep it running (EC2)

Use a process manager so it restarts on crash/reboot:

```bash
# option A: pm2
npm i -g pm2 && pm2 start "npm start" --name myafriart && pm2 save && pm2 startup
# option B: systemd unit running `node server.mjs` with Restart=always
```

Put it behind an ALB / Nginx for TLS on 80/443 → forward to PORT 3000.

## Environment

Set runtime env (Supabase URL/keys, AI gateway key, etc.) in the shell / systemd unit /
pm2 ecosystem file. `PORT` overrides the listen port.

## Notes

- No Cloudflare Workers / edge runtime is used. The `build:cloudflare` script was removed.
- `npm start` now launches a real server (previously the build output exited immediately).
