import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";
import { deleteTicketById } from "./support/db";

// /api/users/agents and /api/tickets/:id live on the server, not the client (baseURL), and the
// test process inherits SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config`
// import — same pattern as tickets-detail.spec.ts / users-list.spec.ts.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const TICKETS_API = `${SERVER_URL}/api/tickets`;
const AGENTS_API = `${SERVER_URL}/api/users/agents`;
const USERS_API = `${SERVER_URL}/api/users`;
const INBOUND_EMAIL_API = `${SERVER_URL}/api/inbound-email`;

// The e2e-spawned server is started with this exact value (playwright.config.ts overrides
// INBOUND_EMAIL_WEBHOOK_SECRET for the webServer) — same as tickets-detail.spec.ts.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set — copy e2e/.env.example to e2e/.env");
}

// Guaranteed not to correspond to any row: Ticket.id is a plain autoincrementing integer, and
// the test DB is never dropped/recreated between runs, but ids in the billions are never going
// to be reached by autoincrement in practice. Same reasoning for the bogus AuthUser id string.
const NONEXISTENT_TICKET_ID = 999_999_999;
const NONEXISTENT_AGENT_ID = "nonexistent-agent-id";

test.describe("GET /api/users/agents authorization", () => {
  test("no session -> 401 Unauthorized", async ({ request }) => {
    const res = await request.get(AGENTS_API);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // Same admin-only gate as /api/users, unlike /api/tickets/:id — an AGENT can view a ticket's
  // assignee but can't list agents to assign it to.
  test("AGENT session -> 403 Forbidden", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.get(AGENTS_API);
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  test("ADMIN session -> 200 with only AGENT-role users, in the documented shape", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(AGENTS_API);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.agents)).toBe(true);

    // Looked up by name rather than asserting an exact array length/order — other spec files
    // (e.g. create-user.spec.ts) create and delete their own throwaway AGENT-role users against
    // this same shared test DB, and fullyParallel execution means one could transiently exist
    // when this runs. The seeded E2E Agent is always present regardless.
    const seededAgent = body.agents.find((a: { name: string }) => a.name === AGENT_USER.name);
    expect(seededAgent).toBeDefined();
    expect(typeof seededAgent.id).toBe("string");
    expect(Object.keys(seededAgent).sort()).toEqual(["id", "name"].sort());

    // Role filter is doing real work: the seeded ADMIN never shows up here even though
    // GET /api/users returns both roles.
    expect(body.agents.some((a: { name: string }) => a.name === ADMIN_USER.name)).toBe(false);
  });
});

test.describe("PATCH /api/tickets/:id (assignedToId) authorization & validation", () => {
  // Same approach as tickets-detail.spec.ts: create a real ticket via the inbound-email
  // webhook, and hard-delete it afterwards since there's no DELETE /api/tickets/:id route.
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  async function createTicket(request: import("@playwright/test").APIRequestContext) {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `assign-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        fromName: "Jane Customer",
        subject: "Help with my order",
        body: "My order hasn't arrived yet.",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    createdTicketIds.push(body.ticket.id);
    return body.ticket;
  }

  test("no session -> 401 Unauthorized", async ({ request }) => {
    const ticket = await createTicket(request);
    const res = await request.patch(`${TICKETS_API}/${ticket.id}`, { data: { assignedToId: null } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // Deliberate business rule: an AGENT can view a ticket's current assignee via
  // GET /api/tickets/:id (see tickets-detail.spec.ts) but can't change it.
  test("AGENT session -> 403 Forbidden (agents can view assignment but not change it)", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.patch(`${TICKETS_API}/${ticket.id}`, { data: { assignedToId: null } });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  // The route parses the id itself and returns a dedicated 400 before ever reaching
  // db.ticket.findUnique — same reasoning as the equivalent GET /api/tickets/:id test.
  test("non-numeric ticket id -> 400 Invalid ticket id", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.patch(`${TICKETS_API}/not-a-number`, { data: { assignedToId: null } });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket id" });
  });

  // Body fails core's updateTicketSchema's .refine() — none of status/category/assignedToId is
  // present, so the schema-level "at least one field" rule rejects it before any per-field
  // validation runs. Exact message confirmed against updateTicketSchema's own refine message,
  // not guessed.
  test("empty body -> 400 (at least one of status, category, or assignedToId is required)", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.patch(`${TICKETS_API}/${ticket.id}`, { data: {} });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "At least one of status, category, or assignedToId must be provided" });
  });

  test("assignedToId that isn't an active agent -> 400 Assignee must be an active agent", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, ADMIN_USER);

    // Case 1: id doesn't correspond to any AuthUser at all.
    const nonexistentRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { assignedToId: NONEXISTENT_AGENT_ID },
    });
    expect(nonexistentRes.status()).toBe(400);
    expect(await nonexistentRes.json()).toEqual({ error: "Assignee must be an active agent" });

    // Case 2: id belongs to a real, non-deleted user — but an ADMIN, not an AGENT. Proves the
    // route checks role, not just existence. Looked up via GET /api/users rather than hardcoded,
    // since AuthUser ids are generated.
    const usersRes = await page.request.get(USERS_API);
    expect(usersRes.status()).toBe(200);
    const admin = (await usersRes.json()).users.find((u: { email: string }) => u.email === ADMIN_USER.email);
    expect(admin).toBeDefined();

    const adminIdRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { assignedToId: admin.id },
    });
    expect(adminIdRes.status()).toBe(400);
    expect(await adminIdRes.json()).toEqual({ error: "Assignee must be an active agent" });
  });

  test("nonexistent ticket id -> 404 Not Found", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.patch(`${TICKETS_API}/${NONEXISTENT_TICKET_ID}`, {
      data: { assignedToId: null },
    });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "Ticket not found" });
  });

  test("ADMIN session -> 200 assigns to a real agent, then 200 unassigns", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, ADMIN_USER);

    const agentsRes = await page.request.get(AGENTS_API);
    const agent = (await agentsRes.json()).agents.find((a: { name: string }) => a.name === AGENT_USER.name);
    expect(agent).toBeDefined();

    const assignRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { assignedToId: agent.id },
    });
    expect(assignRes.status()).toBe(200);
    const assignBody = await assignRes.json();
    expect(assignBody.ticket.id).toBe(ticket.id);
    expect(assignBody.ticket.assignedTo).toEqual({ id: agent.id, name: AGENT_USER.name });
    // Same response shape as GET /api/tickets/:id (tickets-detail.spec.ts) — no extra/missing
    // fields introduced by the PATCH-specific update.
    expect(Object.keys(assignBody.ticket).sort()).toEqual(
      ["id", "subject", "status", "category", "fromEmail", "fromName", "body", "createdAt", "updatedAt", "assignedTo"].sort(),
    );

    const unassignRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { assignedToId: null },
    });
    expect(unassignRes.status()).toBe(200);
    expect((await unassignRes.json()).ticket.assignedTo).toBeNull();
  });
});

test.describe("PATCH /api/tickets/:id (status/category) — any signed-in user", () => {
  // Same approach as the describe block above: create a real ticket via the inbound-email
  // webhook, and hard-delete it afterwards since there's no DELETE /api/tickets/:id route.
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  async function createTicket(request: import("@playwright/test").APIRequestContext) {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `update-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        fromName: "Jane Customer",
        subject: "Help with my order",
        body: "My order hasn't arrived yet.",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    createdTicketIds.push(body.ticket.id);
    return body.ticket;
  }

  // New behavior: unlike assignedToId (ADMIN-only, see above), status/category changes are
  // allowed for any signed-in user — matching project-scope.md's "agents manage tickets".
  test("AGENT session -> 200 updates status alone", async ({ page }) => {
    const ticket = await createTicket(page.request);
    expect(ticket.status).toBe("OPEN"); // webhook-created tickets default to OPEN (schema.prisma)
    await loginViaUi(page, AGENT_USER);

    const res = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { status: "RESOLVED" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ticket.id).toBe(ticket.id);
    expect(body.ticket.status).toBe("RESOLVED");
  });

  test("AGENT session -> 200 updates category alone, including unsetting it back to null", async ({ page }) => {
    const ticket = await createTicket(page.request);
    expect(ticket.category).toBeNull(); // webhook created it with no category
    await loginViaUi(page, AGENT_USER);

    const setRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { category: "REFUND_REQUEST" },
    });
    expect(setRes.status()).toBe(200);
    expect((await setRes.json()).ticket.category).toBe("REFUND_REQUEST");

    const unsetRes = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { category: null },
    });
    expect(unsetRes.status()).toBe(200);
    expect((await unsetRes.json()).ticket.category).toBeNull();
  });

  // A body mixing assignedToId with status/category from a non-admin is rejected wholesale by
  // the route's inline permission check, before db.ticket.update ever runs — not partially
  // applied to just the fields an AGENT would otherwise be allowed to change.
  test("AGENT session mixing assignedToId with status -> 403, and status is NOT changed", async ({ page }) => {
    const ticket = await createTicket(page.request);
    expect(ticket.status).toBe("OPEN");
    await loginViaUi(page, AGENT_USER);

    const res = await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { assignedToId: null, status: "RESOLVED" },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });

    const getRes = await page.request.get(`${TICKETS_API}/${ticket.id}`);
    expect(getRes.status()).toBe(200);
    expect((await getRes.json()).ticket.status).toBe("OPEN");
  });
});

test.describe("Ticket detail Select controls (real browser flow)", () => {
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  // Exercises the actual portal-based Base UI Select end to end (open it, pick an option,
  // confirm the change survives a reload) — the kind of interaction TicketDetailPage.test.tsx
  // deliberately doesn't cover (see TicketsFilters.test.tsx precedent: component tests here
  // check a Select renders, not that opening/selecting an option works).
  test("ADMIN can assign an unassigned ticket to an agent via the select, and it persists across a reload", async ({
    page,
  }) => {
    const res = await page.request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `assign-ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        fromName: "Jane Customer",
        subject: "Need help assigning this",
        body: "Please look into my request.",
      },
    });
    expect(res.status()).toBe(201);
    const ticket = (await res.json()).ticket;
    createdTicketIds.push(ticket.id);

    await loginViaUi(page, ADMIN_USER);
    await page.goto(`/tickets/${ticket.id}`);

    // Text-content assertions below use toContainText, not toHaveText: the trigger's
    // accessible name comes from its explicit aria-label ("Assign to agent"), but its
    // *rendered* textContent also includes the (decorative) chevron icon glyph alongside the
    // SelectValue text, so an exact match would be brittle against that icon's markup.
    const assignSelect = page.getByRole("combobox", { name: "Assign to agent" });
    await expect(assignSelect).toBeVisible();
    await expect(assignSelect).toContainText("Unassigned");

    await assignSelect.click();
    await page.getByRole("option", { name: AGENT_USER.name }).click();

    await expect(assignSelect).toContainText(AGENT_USER.name);

    // Reload to prove the assignment was actually persisted server-side, not just reflected
    // optimistically in client state.
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Assign to agent" })).toContainText(AGENT_USER.name);
  });

  // Same shape as the assignment flow above, but as an AGENT (who can't see the "Assign to
  // agent" select at all) changing the "Ticket status" select instead — the ADMIN-only
  // assignment select and the any-user status/category selects are gated independently, so this
  // is worth its own real-browser coverage rather than assuming the ADMIN flow proves it.
  test("AGENT can change a ticket's status via the select, and it persists across a reload", async ({ page }) => {
    const res = await page.request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `status-ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        fromName: "Jane Customer",
        subject: "Need help with status",
        body: "Please look into my request.",
      },
    });
    expect(res.status()).toBe(201);
    const ticket = (await res.json()).ticket;
    createdTicketIds.push(ticket.id);
    expect(ticket.status).toBe("OPEN");

    await loginViaUi(page, AGENT_USER);
    await page.goto(`/tickets/${ticket.id}`);

    const statusSelect = page.getByRole("combobox", { name: "Ticket status" });
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toContainText("Open");

    await statusSelect.click();
    await page.getByRole("option", { name: "Resolved" }).click();

    // Waits for the mutation's onSuccess refetch to actually settle the new value, not just an
    // optimistic client-side change — same intent as the assignment flow's reload check above,
    // but here the settled state is observable directly without needing a reload.
    await expect(statusSelect).toContainText("Resolved");

    await page.reload();
    await expect(page.getByRole("combobox", { name: "Ticket status" })).toContainText("Resolved");
  });
});
