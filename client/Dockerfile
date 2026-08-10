# Build context is the repo root (needed to resolve the `core: workspace:*` dependency).
# docker build -f client/Dockerfile -t ticket-client \
#   --build-arg VITE_API_URL=http://localhost:3001 .
FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY core/package.json core/package.json

RUN bun install --frozen-lockfile

COPY core core
COPY client client

WORKDIR /app/client

# Baked into the static bundle at build time by Vite — must be set as build args.
ARG VITE_API_URL
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT

RUN bun run build

# ---- runtime: just the static output + the tiny Bun server, no node_modules needed ----
FROM oven/bun:1.3.14

WORKDIR /app

COPY --from=build /app/client/dist ./dist
COPY client/serve.ts ./serve.ts

EXPOSE 3000

CMD ["bun", "serve.ts"]
