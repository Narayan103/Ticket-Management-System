import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";
import { deleteTicketById } from "./support/db";

// /api/tickets/:id lives on the server, not the client (baseURL), and the test process
// inherits SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config` import — same
// pattern as tickets-list.spec.ts / inbound-email.spec.ts.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const TICKETS_API = `${SERVER_URL}/api/tickets`;
const INBOUND_EMAIL_API = `${SERVER_URL}/api/inbound-email`;

// The e2e-spawned server is started with this exact value (playwright.config.ts overrides
// INBOUND_EMAIL_WEBHOOK_SECRET for the webServer) — same as inbound-email.spec.ts.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set — copy e2e/.env.example to e2e/.env");
}

// Guaranteed not to correspond to any row: Ticket.id is a plain autoincrementing integer, and
// the test DB is never dropped/recreated between runs, but ids in the billions are never going
// to be reached by autoincrement in practice.
const NONEXISTENT_TICKET_ID = 999_999_999;

test.describe("GET /api/tickets/:id authorization", () => {
  // Creates a real ticket via the inbound-email webhook (same approach as
  // inbound-email.spec.ts) so the 200 cases have a real row to fetch. There's no DELETE
  // route for tickets, so every id created here is tracked and hard-deleted afterwards, or
  // repeated runs would accumulate rows.
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  async function createTicket(request: import("@playwright/test").APIRequestContext) {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      data: {
        fromEmail: `detail-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
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
    const res = await request.get(`${TICKETS_API}/${ticket.id}`);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // Unlike /api/users (admin-only), /api/tickets/:id is intentionally viewable by both roles —
  // same contrast as tickets-list.spec.ts.
  test("AGENT session -> 200 (ticket detail is NOT admin-gated, unlike /api/users)", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.get(`${TICKETS_API}/${ticket.id}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ticket.id).toBe(ticket.id);
    expect(body.ticket.subject).toBe(ticket.subject);
    expect(body.ticket.status).toBe(ticket.status);
    expect(body.ticket.category).toBe(ticket.category);
    expect(body.ticket.fromEmail).toBe(ticket.fromEmail);
    expect(body.ticket.fromName).toBe(ticket.fromName);
    expect(body.ticket.body).toBe(ticket.body);
    expect(body.ticket.bodyHtml).toBe(ticket.bodyHtml);
    expect(typeof body.ticket.createdAt).toBe("string");
    expect(typeof body.ticket.updatedAt).toBe("string");
    expect(body.ticket.assignedTo).toBeNull(); // never assigned by any current flow
    expect(body.ticket.replies).toEqual([]); // no replies posted in this test

    // No unexpected extra/missing fields in the response shape (e.g. assignedToId from the
    // list/webhook response isn't part of this endpoint's documented shape).
    expect(Object.keys(body.ticket).sort()).toEqual(
      ["id", "subject", "status", "category", "fromEmail", "fromName", "body", "bodyHtml", "createdAt", "updatedAt", "assignedTo", "replies"].sort(),
    );
  });

  test("ADMIN session -> 200", async ({ page }) => {
    const ticket = await createTicket(page.request);
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(`${TICKETS_API}/${ticket.id}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ticket.id).toBe(ticket.id);
  });

  test("nonexistent ticket id -> 404 Not Found", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(`${TICKETS_API}/${NONEXISTENT_TICKET_ID}`);
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "Ticket not found" });
  });

  // Not just a passthrough of req.params -> a raw Prisma call: the route parses the id itself
  // and returns a dedicated 400 before ever reaching db.ticket.findUnique, so it's worth
  // covering directly rather than assuming Prisma/Express would produce the same result.
  test("non-numeric ticket id -> 400 Invalid ticket id", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(`${TICKETS_API}/not-a-number`);
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket id" });
  });
});
