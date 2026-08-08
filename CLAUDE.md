# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs (read these first)

- `project-scope.md` — product scope: features, ticket statuses, categories, user roles
- `tech-stack.md` — the finalized tech stack; this is the user's settled choice, don't propose alternatives
- `implementation-plan.md` — phased task breakdown; this is the user's finalized plan, follow it as written rather than re-raising scope questions

## Using context7

Before writing or changing code that touches Bun, Express, React, or Vite APIs, use the `context7` MCP server (`resolve-library-id` then `query-docs`) to pull current documentation rather than relying on training data — this stack (especially Bun) moves fast enough that remembered APIs/flags can be stale or wrong.

## Writing plans

When using plan mode in this repo, keep the plan file concise and high-level — describe the approach, the files touched, and the key decisions/rationale, not full code implementations. A plan should read like a plan (short prose, file names, brief snippets only where a detail is genuinely non-obvious), not a duplicate of the code that implementation will actually produce.

## Test strategy: component tests first, E2E only when necessary

Default to component tests (Vitest + RTL, see "Writing component tests" below) for anything that's really about a component's own behavior — given some props or mocked data, does it render the right thing, call the right callback, show the right error. Reach for an E2E test only when the behavior genuinely can't be verified without a real server/browser: auth middleware and session handling (`requireAuth`/`requireAdmin`, login/logout, session-cookie behavior), real routing/redirect behavior (`ProtectedLayout`/`AdminLayout`), and flows that span multiple real requests (e.g. create something → it shows up elsewhere without a reload).

Concrete precedent: `TicketsTable`'s sort-order and category-label rendering were originally covered by *both* an E2E test (create real tickets via the inbound-email webhook, navigate to `/tickets`, check DOM order/text) and a component test. The E2E version added nothing — `TicketsTable` doesn't sort anything itself, it just renders whatever it's given — so it was removed in favor of `TicketsTable.test.tsx`'s dedicated tests ("renders tickets in the order given", "renders category as its human label..."). `e2e/tests/tickets-list.spec.ts` kept only its authorization tests (`GET /api/tickets` 401/200 checks), since those verify real server middleware with no component-test equivalent.

When a new feature needs tests, default to component tests for the UI piece, and only add E2E coverage for the piece that's actually server/routing/session-shaped — not as a blanket "also write E2E for this" reflex.

**Rule: an E2E test must earn its place by testing something no unit/component test can.** Before adding an E2E test, check whether an existing (or planned) component test already exercises the same behavior — form field validation messages, "blocks submission on invalid input," modal open/close wiring, prefilled values, rendering given some data, etc. are all component-testable; if a component test already covers it, don't also assert it in Playwright. This applies retroactively too: when touching an E2E spec file, prune any test whose behavior a component test already proves, don't just add to the pile.

What's actually left over, and thus worth an E2E test, is behavior that's structurally impossible to verify without a real server/browser:
- Real server responses — status codes, error messages, and business rules enforced by the route/DB (auth middleware 401/403, `requireAdmin`, uniqueness constraints, Prisma-backed validation) — since there's no server-side unit test suite in this repo (see `server/` — no `*.test.ts` files), these can *only* be verified by actually calling the API.
- Real routing/redirect behavior (`ProtectedLayout`/`AdminLayout`) and real session lifecycle (cookie persistence across reload, sign-out actually clearing the server-side session).
- Real multi-request flows: submit something → it persists server-side → it shows up elsewhere without a reload → it survives an actual page reload. A component test's mocked `apiClient` can assert a request *was called with* the right args, but can't prove the server actually accepted and persisted it.
- Real interaction with portal-based UI (e.g. Base UI `Select` open/pick) that jsdom component tests can't drive — see `TicketsFilters.test.tsx`'s precedent of only testing that a `Select` renders, not that opening it and picking an option works.

Concrete precedent: `TicketsTable`'s sort-order and category-label rendering were originally covered by *both* an E2E test (create real tickets via the inbound-email webhook, navigate to `/tickets`, check DOM order/text) and a component test. The E2E version added nothing — `TicketsTable` doesn't sort anything itself, it just renders whatever it's given — so it was removed in favor of `TicketsTable.test.tsx`'s dedicated tests ("renders tickets in the order given", "renders category as its human label..."). `e2e/tests/tickets-list.spec.ts` kept only its authorization tests (`GET /api/tickets` 401/200 checks), since those verify real server middleware with no component-test equivalent. The same pruning was later applied to `create-user.spec.ts` and `edit-user.spec.ts`: their per-field validation tests (name-too-short, invalid email, password-too-short) and the edit dialog's prefill check were removed once `CreateUserForm.test.tsx`/`EditUserForm.test.tsx` were confirmed to cover the identical behavior, leaving only the real-server-dependent cases (actually creates/persists the user, duplicate-email enforcement, password-change behavior confirmed via a real subsequent login).

## Writing E2E tests

Use the `e2e-test-writer` agent (`.claude/agents/e2e-test-writer.md`) to write or update Playwright end-to-end tests, rather than writing them directly — it has this project's testing setup and conventions (test database, `webServer` config, auth flow, role-gating patterns) built in. Delegate to it proactively whenever a user-facing feature (a new page, route, form, or auth/role-gated flow) is added or changed and genuinely needs E2E coverage per the strategy above — not just when explicitly asked for tests, but also not reflexively for every change.

## Writing component tests

Client component tests use **Vitest** + **React Testing Library**, configured in the `test` block of `client/vite.config.ts` (`environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test-setup.ts'` which imports `@testing-library/jest-dom` matchers).

- Co-locate tests next to the component: `Foo.tsx` → `Foo.test.tsx`.
- Any component under a `QueryClientProvider` (i.e. anything using `useQuery`/`useMutation`) must be rendered with `renderWithQuery` from `client/src/test-utils.tsx`, not raw RTL `render` — it wraps the component in a fresh `QueryClient` per test (`retry: false`, so failures surface immediately instead of retrying). `UsersPage.test.tsx` is the reference example.
- Mock `apiClient` (`vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }))`) rather than mocking `axios` or hitting the real API — `axios.isAxiosError` is left un-mocked so error-shape assertions still work against plain rejected objects (`{ isAxiosError: true, response: { data: { error: '...' } } }`).
- Because `globals: true` is set, `describe`/`it`/`expect`/`vi` don't need importing, but this codebase imports them explicitly from `vitest` anyway for clarity — follow that convention.
- Run with `bun run test` (single run) or `bun run test:watch` (watch mode) from `client/`.

## Role enum

Both projects define a `Role` type/value for `'ADMIN' | 'AGENT'` and code should reference it instead of the raw string literals — don't write `'ADMIN'`/`'AGENT'` inline in comparisons or type annotations outside these definitions.

- **Server**: `server/types/role.ts` — a real TS `enum Role { ADMIN = "ADMIN", AGENT = "AGENT" }`. Used e.g. in `server/index.ts` (`role: Role.AGENT` when creating a user) and `server/require-auth.ts` (`requireAdmin`'s `req.user?.role !== Role.ADMIN` check).
- **Client**: `client/src/types/role.ts` — **not** a TS `enum`. The client's `tsconfig.app.json`/`tsconfig.node.json` set `erasableSyntaxOnly: true` (Vite transpiles each file independently and can't erase real `enum` declarations, which emit runtime object code), so `enum` syntax fails to build there. Use the const-object + derived-type pattern instead:
  ```ts
  export const Role = { ADMIN: "ADMIN", AGENT: "AGENT" } as const
  export type Role = (typeof Role)[keyof typeof Role]
  ```
  Call sites look identical either way (`Role.ADMIN`, `Role.AGENT`) — see `AdminLayout.tsx`, `NavBar.tsx`, `UsersPage.tsx`.
- The two `Role` definitions are separate, hand-kept-in-sync values, deliberately *not* pulled into the shared `core` package (see "Shared code" below) — the server's real TS `enum` would fail to compile under the client's `erasableSyntaxOnly` setting if imported through `core`, since `tsc` applies the *importing* project's compiler options to every file in its program, not the exporting file's own tsconfig.

## Enum-shaped types: const-object vs. plain union

Not every DB-backed enum needs the `Role`-style const-object treatment above. Which pattern to use depends on whether the code needs a runtime value, not just a type:

- **Use the const-object + derived-type pattern** (like `Role`) when call sites need to *reference* a named value at runtime — comparisons (`session.user.role === Role.ADMIN`), passing it as an argument, etc.
- **Use a plain union type** (e.g. `client/src/types/ticket-status.ts`: `export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED"`, and `client/src/types/ticket-category.ts` for `TicketCategory`) when the only need is type-checking — annotating a prop, keying a `Record<...>` lookup (object literal keys are just written as plain strings either way: `{ OPEN: '...', RESOLVED: '...' }`), or displaying the value as-is. No exported runtime object, so there's nothing to reference like `TicketStatus.OPEN` in code — write the string literal directly.

`TicketsTable.tsx` is the reference example: `STATUS_STYLES`/`CATEGORY_LABELS` are `Record<TicketStatus, string>`/`Record<TicketCategory, string>` lookups keyed by plain string literals, since nothing needs to compare against or pass around a named `TicketStatus.OPEN`-style value — only `Role` currently meets the bar for the heavier pattern.

## Shared code (`core` package)

`core/` is an internal, unbuilt package for code that both `client/` and `server/` need to import identically — currently just zod validation schemas (see "Data validation" below). It's a workspace member (see "Commands"), declared as a dependency in both `client/package.json` and `server/package.json` as `"core": "workspace:*"`, and imported like any other package: `import { createUserSchema } from "core"`.

- `core/package.json`'s `main`/`types` point straight at `./src/index.ts` — there's no build step. Both Bun (`server/`) and Vite/esbuild (`client/`) transpile `core`'s `.ts` source directly at import time, the same way they handle their own source, since both projects already use `"moduleResolution": "bundler"` + `allowImportingTsExtensions`.
- `core/src/index.ts` is a barrel re-exporting everything from `core/src/schemas/*.ts` (one file per resource, e.g. `core/src/schemas/user.ts` exports `createUserSchema`/`CreateUserInput`) — add new shared schemas as new files there and re-export them from the barrel, rather than growing a single file.
- Not everything belongs in `core` — only put a schema (or other code) there if both `client/` and `server/` genuinely need the *same* definition. See the `Role` note above for a case that deliberately stays split instead.

## Writing forms

Client-side forms use **react-hook-form** + **zod** (via `@hookform/resolvers/zod`) — not manual `useState` per field, and not raw HTML5 validation attributes. `client/src/components/CreateUserForm.tsx` is the reference example.

- Define a `z.object({...})` schema colocated with the form component (or in `core`, if the server needs the same shape — see "Data validation" below), derive the form type with `z.infer<typeof schema>`, and pass `{ resolver: zodResolver(schema) }` to `useForm`.
- Wire fields with `register('fieldName')` on the shadcn `Input`, and render errors with `FieldError errors={[errors.fieldName]}` from `@/components/ui/field` — this project's shadcn setup has the newer `Field`/`FieldLabel`/`FieldError` primitives instead of the classic RHF-bound `Form`/`FormField` components, so it's wired to `formState.errors` by hand, not through a `<Form>` wrapper.
- Add `noValidate` to the `<form>` if any field uses an HTML5-validated input type (e.g. `type="email"`) — otherwise the browser's native constraint validation blocks submission before react-hook-form/zod ever runs, and your zod error message never appears.
- When a form lives inside a modal, split it into two components: a thin `*Modal.tsx` that only owns the `Dialog` chrome and `open`/`onOpenChange` state, and a `*Form.tsx` that owns the `useForm`/`useMutation`/fields (`CreateUserModal.tsx` + `CreateUserForm.tsx` is the reference pair). Reset the form when the dialog closes with a `useEffect` watching the `open` prop (`if (!open) reset()`) rather than wrapping `onOpenChange` — that way reset fires no matter how the dialog closed (submit success, Escape, backdrop click, or the built-in close button), not just the paths the modal wrapper happens to intercept.

## Shared client utilities & components

Before writing a new page/component, check whether it needs one of these already-extracted pieces instead of re-writing the logic inline — each was pulled out after the same code showed up independently in 2-3 places:

- **`getErrorMessage(error, fallback)`** (`client/src/lib/get-error-message.ts`) — turns a react-query `error` (from `useQuery` or `useMutation`) into a display string: unwraps `axios.isAxiosError(error)`'s `response.data.error`, falls back to `error.message`, or to the given `fallback` string for a non-axios error; returns `null` if there's no error at all. Use this instead of re-writing the `axios.isAxiosError(error) ? ... : fallback` ternary — see `TicketDetailPage.tsx`, `CreateUserForm.tsx`, `ReplyForm.tsx` for call sites.
- **`formatDateTime(value, dateStyle?)`** / **`formatDate(value)`** (`client/src/lib/format-date.ts`) — `formatDateTime` wraps `new Date(value).toLocaleString(undefined, { dateStyle, timeStyle: 'short' })` (`dateStyle` defaults to `'short'`; pass `'medium'`/`'long'` for a more verbose display); `formatDate` is the date-only `toLocaleDateString()` case. Use these instead of inlining `new Date(...).toLocaleString(...)`/`.toLocaleDateString()`.
- **`<ErrorMessage message={string | null} />`** (`client/src/components/ErrorMessage.tsx`) — the page-level query-error paragraph (renders nothing if `message` is `null`). Use this for a page's top-level "the fetch failed" display — see `TicketsPage.tsx`, `UsersPage.tsx`, `TicketDetailPage.tsx`. A smaller, differently-styled mutation-level error (e.g. `TicketDetailPage.tsx`'s inline update-error text) is a different visual case and doesn't use this component — prefer `FieldError` (see "Writing forms" above) for form/mutation errors instead.
- **`<EmptyState message={string} />`** (`client/src/components/EmptyState.tsx`) — the "No X found." paragraph shown when a list/table has zero rows. Use this instead of a one-off `<p>`.
- **`<TableSkeleton header={ReactNode} columnWidths={string[]} rows?={number} />`** (`client/src/components/TableSkeleton.tsx`) — the loading-state placeholder for a `Card`-wrapped `Table`: renders your real `<TableHeader>` (passed in as `header`, so it's visible even while loading) followed by `rows` (default 5) skeleton rows, one `Skeleton` cell per entry in `columnWidths` (a Tailwind width class per column, e.g. `['w-32', 'w-48']`). Use this for any new paginated/tabular list instead of hand-rolling `Array.from({ length: 5 }).map(...)`.
- **`<FormModal open={} onOpenChange={} title={} description={}>{children}</FormModal>`** (`client/src/components/FormModal.tsx`) — wraps the `Dialog > DialogContent > DialogHeader > DialogTitle + DialogDescription` skeleton for a create/edit-form dialog. Use this for any new "open a dialog containing a form" modal (see `CreateUserModal.tsx`/`EditUserModal.tsx`) instead of writing the `Dialog`/`DialogContent`/`DialogHeader` boilerplate again. A confirm-only dialog with no form (like `DeleteUserModal.tsx`) uses `AlertDialog` instead — a different primitive, not `FormModal`.
- **`useDebouncedValue(value, delayMs)`** (`client/src/lib/use-debounced-value.ts`) — generic debounce hook (see `TicketsPage.tsx`'s search input). Generic, reusable hooks like this belong in `client/src/lib/`, not defined page-local — even a hook with only one current caller should live here if it has no dependency on that page's own state/props.

## Data validation

Use **zod** for validating input on both sides — not manual type checks, regexes, or hand-rolled if-chains. On the client this means react-hook-form + `zodResolver`, per "Writing forms" above.

- **Define schemas shared by client and server in the `core` package, not locally in either project.** If a route's request body and its corresponding client form need to validate the same shape (the common case), write one `z.object({...})` in `core/src/schemas/<name>.ts` (see `createUserSchema` in `core/src/schemas/user.ts`), export it and its `z.infer` type from `core/src/index.ts`, and import it from `"core"` on both sides — see `server/routes/users.ts` and `client/src/components/CreateUserForm.tsx`. Don't redefine the same validation rules separately in `client/` and `server/`.
- **Server**: use `validateBody(schema, data, res)` (`server/lib/validate.ts`) rather than hand-rolling `schema.safeParse(...)` + the `400`/`parsed.error.issues[0]?.message` response per route — it runs `safeParse`, sends that same `400` response on failure, and returns the parsed data (or `undefined`) on success, so a route just does `const data = validateBody(schema, req.body, res); if (!data) return;`. Works for `req.query` too (pass that instead of `req.body`) — see `ticketsRouter.get("/")`'s `listTicketsQuerySchema` call in `server/routes/tickets.ts`.
- A schema only needs to live in `core` if both sides use it — validation that's genuinely one-sided (e.g. a client-only UI-state check with no server counterpart) can stay local to that project instead.

## Commands

The repo root is a **Bun workspace** (`workspaces: ["client", "server", "core"]` in the root `package.json`) — there's a single root-level `bun.lock`/`node_modules`, not separate ones per project. Run `bun install` from the repo **root** (not from inside `client/`/`server/`) whenever a dependency changes anywhere in the workspace, including in `core/`. Every other command (`bun run dev`, `bun run test`, etc.) still runs from inside the individual project's directory, same as before — only the install step moved to the root. `core/` has no scripts of its own and is never run directly. `e2e/` remains a separate Bun project outside the workspace (it doesn't depend on `core`) with its own install.

**Server** (`server/`):
```bash
bun run dev     # bun --watch index.ts
bun run start   # bun index.ts
bunx prisma migrate dev --name <name>   # after editing prisma/schema.prisma
bunx prisma generate                    # regenerate client without a migration
```

**Client** (`client/`):
```bash
bun run dev         # vite dev server
bun run build       # tsc -b && vite build
bun run lint        # oxlint
bun run preview     # preview production build
bun run test        # vitest run — component tests, single run
bun run test:watch  # vitest — component tests, watch mode
```

E2E testing (`e2e/`, Playwright) setup/commands are documented in the `e2e-test-writer` agent, not here — see "Writing E2E tests" above. Component tests (Vitest + RTL, inside `client/`) are documented above under "Writing component tests" instead.

## Architecture

- `server/index.ts` sets up the Express app (run directly by the Bun runtime, no build step) — CORS, better-auth mounting, JSON body parsing, the standalone `/api/me` and `/api/health` routes, then a catch-all 404 handler and a centralized error-handling middleware at the bottom of the file. Resource-specific endpoints live in their own router modules under `server/routes/` (e.g. `server/routes/users.ts` exports `usersRouter`, mounted in `index.ts` via `app.use("/api/users", usersRouter)`) rather than being defined inline — follow that pattern for new resources (e.g. a future `server/routes/tickets.ts`) instead of adding more routes directly to `index.ts`. Router mounts must still go before the two catch-all handlers at the bottom of `index.ts`.
- **Client data fetching**: use `axios` (via the shared `apiClient` instance in `client/src/lib/api-client.ts`, `baseURL: VITE_API_URL` falling back to `http://localhost:3001`, `withCredentials: true`) wrapped in **TanStack Query** (`@tanstack/react-query`) — `useQuery`/`useMutation`, never a raw `fetch()` or manual `useEffect`/`useState` fetch. `QueryClientProvider` is set up once in `client/src/main.tsx`. `UsersPage.tsx` is the reference example: `useQuery({ queryKey: [...], queryFn: () => apiClient.get(...).then(res => res.data) })`, with `axios.isAxiosError(error)` to extract the server's `{ error }` message on failure. Each project has its own `.env.example` documenting its expected env vars — copy to `.env` locally, don't commit `.env`.
- Client and server run on different ports in dev (Vite picks 5173+ depending on availability, server defaults to 3001 via `PORT`), so the CORS setup in `server/index.ts` is required for the client to reach the API at all — don't remove it.
- The client is a Vite `react-ts` template (oxlint for linting, Vitest + React Testing Library for component tests — see "Writing component tests") with `react-router-dom` added for routing (`client/src/App.tsx`), and shadcn/ui (`components.json`, `src/components/ui/`) installed with the default `base-nova` (Base UI, not Radix) theme — add components with `bunx shadcn@latest add <name>` from `client/`.
- **Database**: `server/prisma/schema.prisma` defines `User`/`Session`/`Ticket` models and the `Role`/`TicketStatus`/`TicketCategory` enums (matching `project-scope.md`), backed by a local Postgres `ticket_management` database. This project uses **Prisma 7**, which changed some things from older Prisma docs/training data:
  - The generator is `provider = "prisma-client"` (not `prisma-client-js`), output to `server/generated/prisma` (gitignored, regenerated by `prisma generate`/`migrate dev`) — import from `./generated/prisma/client`, not `@prisma/client` directly.
  - The connection string lives in `prisma.config.ts` (reads `DATABASE_URL` from `.env` via `dotenv/config`), not in the `datasource` block in `schema.prisma`.
  - `PrismaClient` requires an explicit driver adapter — `server/db.ts` builds one with `@prisma/adapter-pg` and exports a singleton `db`. Import `db` from there rather than instantiating `PrismaClient` elsewhere.
  - `/api/health` runs `db.$queryRaw\`SELECT 1\`` to prove live DB connectivity, not just that the process is up — keep that behavior when touching this route.

## Authentication

Auth is handled entirely by **better-auth** (`server/auth.ts`), not hand-rolled sessions.

- The `User`/`Session` models in `schema.prisma` are unused legacy placeholders — the real auth tables are `AuthUser`/`AuthSession`/`AuthAccount`/`AuthVerification`, mapped via `modelName` inside the `betterAuth({...})` config so they don't collide with the domain `User` model. Don't confuse the two when adding fields.
- Email/password only, with `disableSignUp: true` — there is no self-serve registration, matching `project-scope.md` (Admins create Agents). The only way a user currently gets created is `server/prisma/seed.ts`, which reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and creates the admin via `auth.$context.internalAdapter` (not `db.user.create` — that model isn't wired to auth at all).
- `role` (`Role.ADMIN` | `Role.AGENT`) is a required `additionalFields` entry on the better-auth user, set with `input: false` so it can never be supplied by a client-side call — only seeding/server code can set it.
- **Server wiring** (`server/index.ts`): `app.all("/api/auth/*splat", toNodeHandler(auth))` mounts every better-auth endpoint (sign-in, sign-out, get-session, etc.) under `/api/auth/*`, and must stay registered *before* `express.json()` — better-auth's Node handler parses its own request body, so running the JSON body parser first would break it. Protect any new route with the `requireAuth` middleware (`server/require-auth.ts`), which calls `auth.api.getSession(...)` and populates `req.session`/`req.user` (typed via `server/types/express.d.ts`); see `/api/me` for the pattern.
- **Client wiring** (`client/src/lib/auth-client.ts`): `createAuthClient` from `better-auth/react`, pointed at `VITE_API_URL`, with the `inferAdditionalFields` plugin so `role` is typed on `session.user`. Exposes `useSession`/`signIn`/`signOut`, used in `ProtectedLayout.tsx` (redirects to `/login` when there's no session), `LoginPage.tsx` (`signIn.email`), and `NavBar.tsx` (`signOut`).
- **Role-gated routes**: `ProtectedLayout.tsx` only checks for a session; admin-only pages additionally nest under `AdminLayout.tsx` (redirects to `/` if `session.user.role !== 'ADMIN'`). In `App.tsx`, admin-only routes go inside both layouts: `<Route element={<ProtectedLayout />}><Route element={<AdminLayout />}><Route path="/admin-thing" .../></Route></Route>`. `/users` (`UsersPage.tsx`) is the first example of this pattern; `NavBar.tsx` conditionally renders links to such pages behind the same `role === 'ADMIN'` check.
- better-auth's session is a cookie, not a bearer token — `CLIENT_URL` (server env) must match the client's actual origin (used both in `trustedOrigins` in `auth.ts` and the CORS config in `index.ts`), and CORS must keep `credentials: true`, or cross-origin cookie auth breaks in dev.
- Known gotcha: a network-level failure (e.g. the API server isn't running) does not trigger `signIn.email`'s `onError` callback — the login form just silently does nothing. Check `curl http://localhost:3001/api/health` before assuming a frontend bug.
