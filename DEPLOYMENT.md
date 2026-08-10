# Deploying to Railway

This repo deploys to Railway as three pieces in one project: a managed Postgres database, a `server` service (Express/Bun API), and a `client` service (static SPA). Both app services build from the same GitHub repo with **Root Directory set to `/`** (the repo root) — the workspace's `core` package is resolved via `bun install` at the root, so a service's Root Directory must not be narrowed to `client/` or `server/`.

## 1. Database

Add Railway's **Postgres** plugin to the project. It provisions `DATABASE_URL` automatically — reference it from other services as `${{Postgres.DATABASE_URL}}`.

## 2. `server` service

- **Root Directory**: `/`
- **Install**: `bun install --frozen-lockfile`
- **Build**: `cd server && bunx prisma generate`
- **Start**: `cd server && bunx prisma migrate deploy && bun index.ts`
- **Healthcheck path**: `/api/health` (already checks live DB connectivity)

Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | generate a random secret (e.g. `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://${{server.RAILWAY_PUBLIC_DOMAIN}}` |
| `CLIENT_URL` | `https://${{client.RAILWAY_PUBLIC_DOMAIN}}` |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | generate a random secret |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | for the one-time seed run (step 4) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | from Google AI Studio |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | from SendGrid |
| `SENTRY_DSN` | server Sentry project DSN |
| `SENTRY_ENVIRONMENT` | `production` |

`PORT` doesn't need to be set — Railway injects it and `server/index.ts` already reads `process.env.PORT`.

## 3. `client` service

- **Root Directory**: `/`
- **Install**: `bun install --frozen-lockfile`
- **Build**: `cd client && bun run build`
- **Start**: `cd client && bun run start`

Environment variables — these are baked into the static bundle at build time (Vite), so they must be set **before** the build runs, not just at runtime:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://${{server.RAILWAY_PUBLIC_DOMAIN}}` |
| `VITE_SENTRY_DSN` | client Sentry project DSN |
| `VITE_SENTRY_ENVIRONMENT` | `production` |

## 4. Rollout order

1. Deploy `server` first (its domain is needed by `client`; `CLIENT_URL`/`BETTER_AUTH_URL` can be filled in after step 2, then redeploy `server`).
2. Deploy `client` with `VITE_API_URL` pointed at the server's domain.
3. Go back to `server`, set `CLIENT_URL` and `BETTER_AUTH_URL` to the now-known domains, and redeploy — this is what makes CORS and `trustedOrigins` line up.
4. Create the first admin: `railway run --service server -- bun prisma/seed.ts` (safe to leave as a manual step — the script is idempotent, so re-running it is harmless).

## 5. SendGrid inbound parse

Point SendGrid's Inbound Parse webhook at:

```
https://<server-domain>/api/inbound-email?secret=<INBOUND_EMAIL_WEBHOOK_SECRET>
```

The secret is passed as a query param (not a header) because Inbound Parse can only be configured with a bare URL — see `server/require-webhook-secret.ts`.

## Verifying a deploy

- `curl https://<server-domain>/api/health` → `{"status":"ok","database":"connected"}`
- Load the client, log in, and confirm it works end-to-end (proves `VITE_API_URL`, `CLIENT_URL`, and cross-origin cookies are all correctly wired).
- Open a ticket detail page and hard-refresh (`/tickets/<id>`) to confirm the client's SPA fallback (`client/serve.ts`) serves the app instead of a 404.
