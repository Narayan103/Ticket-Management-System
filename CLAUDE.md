# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs (read these first)

- `project-scope.md` — product scope: features, ticket statuses, categories, user roles
- `tech-stack.md` — the finalized tech stack; this is the user's settled choice, don't propose alternatives
- `implementation-plan.md` — phased task breakdown; this is the user's finalized plan, follow it as written rather than re-raising scope questions

## Using context7

Before writing or changing code that touches Bun, Express, React, or Vite APIs, use the `context7` MCP server (`resolve-library-id` then `query-docs`) to pull current documentation rather than relying on training data — this stack (especially Bun) moves fast enough that remembered APIs/flags can be stale or wrong.

## Commands

This is not a workspace/monorepo — `client/` and `server/` are two independent Bun projects, each with its own `package.json` and lockfile. Run commands from inside the respective directory.

**Server** (`server/`):
```bash
bun install
bun run dev     # bun --watch index.ts
bun run start   # bun index.ts
```

**Client** (`client/`):
```bash
bun install
bun run dev       # vite dev server
bun run build     # tsc -b && vite build
bun run lint      # oxlint
bun run preview   # preview production build
```

No test runner is configured in either project yet.

## Architecture

- `server/index.ts` is the entire backend right now: a single Express app (run directly by the Bun runtime, no build step) with CORS enabled, JSON body parsing, one `/api/health` route, then a catch-all 404 handler and a centralized error-handling middleware at the bottom of the file. New routes should be added before those two catch-all handlers, and prefixed with `/api`.
- The client (`client/src/App.tsx`) calls the server via `fetch`, using `VITE_API_URL` (falls back to `http://localhost:3001`). Each project has its own `.env.example` documenting its expected env vars — copy to `.env` locally, don't commit `.env`.
- Client and server run on different ports in dev (Vite picks 5173+ depending on availability, server defaults to 3001 via `PORT`), so the CORS setup in `server/index.ts` is required for the client to reach the API at all — don't remove it.
- The client is a stock Vite `react-ts` template (oxlint for linting, no test setup, no routing library added yet).
