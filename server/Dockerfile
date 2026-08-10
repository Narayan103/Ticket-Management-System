# Build context is the repo root (needed to resolve the `core: workspace:*` dependency).
# docker build -f server/Dockerfile -t ticket-server .
FROM oven/bun:1.3.14

WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY core/package.json core/package.json

RUN bun install --frozen-lockfile

COPY core core
COPY server server

WORKDIR /app/server

RUN bunx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "bunx prisma migrate deploy && bun index.ts"]
