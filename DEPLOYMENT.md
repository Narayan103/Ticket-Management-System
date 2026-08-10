# Deploying to Railway

This repo deploys to Railway as two pieces in one project: a managed Postgres database and a single **`server` service** that runs the Express/Bun API *and* serves the built client (see `server/index.ts`'s static-file + SPA-fallback middleware). One service, one URL, no cross-origin cookies/CORS to worry about between client and server.

The service's **Root Directory must stay `/`** (the repo root) — the workspace's `core` package is resolved via `bun install` at the root, so it can't be narrowed to `server/`.

## 1. Database

Add Railway's **Postgres** plugin to the project. It provisions `DATABASE_URL` automatically — reference it from the server service as `${{Postgres.DATABASE_URL}}`.

## 2. `server` service

- **Root Directory**: `/`
- **Install**: `bun install --frozen-lockfile`
- **Build**: `cd server && bunx prisma generate && cd ../client && bun run build`
- **Start**: `cd server && bunx prisma migrate deploy && bun index.ts`
- **Healthcheck path**: `/api/health` (already checks live DB connectivity)

Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | generate a random secret (e.g. `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `CLIENT_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` (same domain — client is served by this same service) |
| `VITE_API_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` (baked into the client bundle at build time — must be set *before* the build step runs) |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | generate a random secret |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | for the one-time seed run (step 3) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | from Google AI Studio |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | from SendGrid |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | server / client Sentry project DSNs (optional) |
| `SENTRY_ENVIRONMENT` / `VITE_SENTRY_ENVIRONMENT` | `production` |

`PORT` doesn't need to be set — Railway injects it and `server/index.ts` already reads `process.env.PORT`.

Note: `${{RAILWAY_PUBLIC_DOMAIN}}` only resolves once the service has a generated domain (Settings → Networking → Generate Domain). Generate that first, since `BETTER_AUTH_URL`/`CLIENT_URL`/`VITE_API_URL` all depend on it.

## 3. One-time admin seed

After the first successful deploy: `railway run --service server -- bun prisma/seed.ts` (or via the Railway dashboard's one-off command). Safe to leave manual — the script is idempotent, so re-running it is harmless.

## 4. SendGrid inbound parse

Point SendGrid's Inbound Parse webhook at:

```
https://<server-domain>/api/inbound-email?secret=<INBOUND_EMAIL_WEBHOOK_SECRET>
```

The secret is passed as a query param (not a header) because Inbound Parse can only be configured with a bare URL — see `server/require-webhook-secret.ts`.

## Verifying a deploy

- `curl https://<server-domain>/api/health` → `{"status":"ok","database":"connected"}`
- Load `https://<server-domain>/`, confirm the app loads and login works end-to-end.
- Open a ticket detail page and hard-refresh (`/tickets/<id>`) to confirm the SPA fallback in `server/index.ts` serves the app instead of a 404.

## Local Docker Compose (optional, for local testing only)

`docker-compose.yml` / `client/Dockerfile` / `server/Dockerfile` still run the client and server as **two separate containers** for local development convenience (`docker compose up --build`, app at `http://localhost:5173`). That's a different shape than the single combined Railway service above — fine for local testing, just don't confuse the two when reasoning about env vars (`CLIENT_URL` differs between the two setups).
