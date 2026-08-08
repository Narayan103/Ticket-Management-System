import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";
import { deleteTicketById } from "./support/db";

// /api/tickets/:id/replies lives on the server, not the client (baseURL), and the test process
// inherits SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config` import — same
// pattern as tickets-detail.spec.ts / update-ticket.spec.ts.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const TICKETS_API = `${SERVER_URL}/api/tickets`;
const INBOUND_EMAIL_API = `${SERVER_URL}/api/inbound-email`;

// The e2e-spawned server is started with this exact value (playwright.config.ts overrides
// INBOUND_EMAIL_WEBHOOK_SECRET for the webServer) — same as tickets-detail.spec.ts.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set — copy e2e/.env.example to e2e/.env");
}

// Guaranteed not to correspond to any row: Ticket.id is a plain autoincrementing integer, and
// the test DB is never dropped/recreated between runs, but ids in the billions are never going
// to be reached by autoincrement in practice. Same reasoning as tickets-detail.spec.ts.
const NONEXISTENT_TICKET_ID = 999_999_999;

// Creates a real ticket via the inbound-email webhook (same approach as tickets-detail.spec.ts /
// update-ticket.spec.ts). There's no DELETE route for tickets, so callers must track the
// returned id and hard-delete it via deleteTicketById in an afterEach — Reply rows cascade-delete
// automatically via the DB-level onDelete: Cascade FK on Reply.ticketId (enforced by Postgres
// itself, whether the delete comes through Prisma or, as deleteTicketById does, a raw `pg`
// client), so no separate reply-cleanup helper is needed.
async function createTicket(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post(INBOUND_EMAIL_API, {
    headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
    data: {
      fromEmail: `reply-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      fromName: "Jane Customer",
      subject: "Help with my order",
      body: "My order hasn't arrived yet.",
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return body.ticket;
}

test.describe("POST /api/tickets/:id/replies authorization & validation", () => {
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  test("no session -> 401 Unauthorized", async ({ request }) => {
    const ticket = await createTicket(request);
    createdTicketIds.push(ticket.id);

    const res = await request.post(`${TICKETS_API}/${ticket.id}/replies`, { data: { body: "Thanks for reaching out." } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // No extra role gate beyond requireAuth — any signed-in agent can reply, matching
  // project-scope.md's "agents manage tickets" (same as the status/category PATCH behavior in
  // update-ticket.spec.ts).
  test("AGENT session -> 201, and the reply is attributed to that agent as senderType AGENT", async ({ page }) => {
    const ticket = await createTicket(page.request);
    createdTicketIds.push(ticket.id);
    await loginViaUi(page, AGENT_USER);

    const res = await page.request.post(`${TICKETS_API}/${ticket.id}/replies`, {
      data: { body: "Thanks for reaching out, looking into it now." },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.reply.body).toBe("Thanks for reaching out, looking into it now.");
    expect(body.reply.senderType).toBe("AGENT");
    expect(body.reply.author).toEqual({ id: expect.any(String), name: AGENT_USER.name });
    expect(typeof body.reply.createdAt).toBe("string");

    // Same response shape as the replies embedded in GET /api/tickets/:id (tickets.ts route) —
    // no extra/missing fields introduced by the POST-specific create.
    expect(Object.keys(body.reply).sort()).toEqual(["id", "body", "senderType", "createdAt", "author"].sort());
  });

  test("ADMIN session -> 201", async ({ page }) => {
    const ticket = await createTicket(page.request);
    createdTicketIds.push(ticket.id);
    await loginViaUi(page, ADMIN_USER);

    const res = await page.request.post(`${TICKETS_API}/${ticket.id}/replies`, {
      data: { body: "An admin is following up on this." },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.reply.senderType).toBe("AGENT"); // hardcoded server-side regardless of role
    expect(body.reply.author).toEqual({ id: expect.any(String), name: ADMIN_USER.name });
  });

  // Fails core's createReplySchema (trimmed, min length 1). A completely missing `body` key
  // fails zod's underlying "expected string" type check (not the schema's own custom .min()
  // message, which only applies once a string is actually present) — confirmed against the
  // actual zod error rather than assumed, so it's asserted separately from the empty-string/
  // whitespace-only cases below, which do produce createReplySchema's "Reply cannot be empty".
  test("empty/missing body -> 400", async ({ page }) => {
    const ticket = await createTicket(page.request);
    createdTicketIds.push(ticket.id);
    await loginViaUi(page, AGENT_USER);

    const missingRes = await page.request.post(`${TICKETS_API}/${ticket.id}/replies`, { data: {} });
    expect(missingRes.status()).toBe(400);
    expect((await missingRes.json()).error).toBeTruthy();

    const emptyRes = await page.request.post(`${TICKETS_API}/${ticket.id}/replies`, { data: { body: "" } });
    expect(emptyRes.status()).toBe(400);
    expect(await emptyRes.json()).toEqual({ error: "Reply cannot be empty" });

    // Whitespace-only also fails: the schema trims before checking min length.
    const whitespaceRes = await page.request.post(`${TICKETS_API}/${ticket.id}/replies`, { data: { body: "   " } });
    expect(whitespaceRes.status()).toBe(400);
    expect(await whitespaceRes.json()).toEqual({ error: "Reply cannot be empty" });
  });

  test("nonexistent ticket id -> 404 Not Found", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.post(`${TICKETS_API}/${NONEXISTENT_TICKET_ID}/replies`, {
      data: { body: "This should never be created." },
    });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "Ticket not found" });
  });

  // The route parses the id itself and returns a dedicated 400 before ever reaching
  // db.ticket.findUnique — same reasoning as the equivalent GET/PATCH /api/tickets/:id tests.
  test("non-numeric ticket id -> 400 Invalid ticket id", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.post(`${TICKETS_API}/not-a-number/replies`, {
      data: { body: "Doesn't matter, id parsing fails first." },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket id" });
  });
});

test.describe("Ticket detail reply form (real browser flow)", () => {
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  // Spans multiple real requests (POST the reply, then the thread re-fetching via the
  // ticket-query invalidation in ReplyForm's onSuccess) and asserts the new reply shows up
  // without a page reload — the kind of behavior a component test can't verify, since
  // TicketDetailPage.test.tsx mocks apiClient rather than exercising a real round trip.
  test("AGENT can post a reply via the UI and see it appear in the thread without reloading", async ({ page }) => {
    const res = await page.request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `reply-ui-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        fromName: "Jane Customer",
        subject: "Need help with my reply",
        body: "Please look into my request.",
      },
    });
    expect(res.status()).toBe(201);
    const ticket = (await res.json()).ticket;
    createdTicketIds.push(ticket.id);

    await loginViaUi(page, AGENT_USER);
    await page.goto(`/tickets/${ticket.id}`);

    const main = page.getByRole("main");
    await expect(main.getByText("Replies", { exact: true })).toBeVisible();

    const replyText = `This is a test reply ${Date.now()}`;
    await page.getByLabel("Add a Reply").fill(replyText);
    await page.getByRole("button", { name: "Post Reply" }).click();

    await expect(main.getByText(replyText)).toBeVisible();
    // NavBar also renders the signed-in user's name (e.g. "E2E Agent"), so these assertions are
    // scoped to <main> to target the reply thread specifically, not the nav.
    await expect(main.getByText(AGENT_USER.name)).toBeVisible();
    await expect(main.getByText(/^Agent ·/)).toBeVisible();

    // The textarea is cleared on successful submit (ReplyForm's onSuccess calls reset()).
    await expect(page.getByLabel("Add a Reply")).toHaveValue("");

    // Confirm this wasn't just an optimistic client-side render: reload and the reply should
    // still be there, proving it was actually persisted server-side.
    await page.reload();
    await expect(page.getByRole("main").getByText(replyText)).toBeVisible();
  });
});
