import { expect, test } from "@playwright/test";
import { deleteTicketById, getTicketById } from "./support/db";

// POST /api/inbound-email lives on the server, not the client (baseURL), and the test
// process inherits SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config`
// import — same pattern as users-list.spec.ts.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const INBOUND_EMAIL_API = `${SERVER_URL}/api/inbound-email`;

// The e2e-spawned server is started with this exact value (playwright.config.ts overrides
// INBOUND_EMAIL_WEBHOOK_SECRET for the webServer, the same way it overrides DATABASE_URL) so
// these tests can present a known secret rather than whatever real value server/.env has.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set — copy e2e/.env.example to e2e/.env");
}

function authHeader(secret: string) {
  return { Authorization: `Bearer ${secret}` };
}

// Unique per call so parallel tests never collide on the same fromEmail.
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    fromEmail: `inbound-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    fromName: "Jane Customer",
    subject: "Help with my order",
    body: "My order hasn't arrived yet.",
    ...overrides,
  };
}

test.describe("POST /api/inbound-email", () => {
  // This endpoint has no DELETE route (no ticket UI/API exists yet), so every ticket id
  // created by a test must be tracked here and hard-deleted afterwards, or repeated runs
  // would accumulate rows.
  const createdTicketIds: number[] = [];

  test.afterEach(async () => {
    await Promise.all(createdTicketIds.splice(0).map((id) => deleteTicketById(id)));
  });

  test("valid secret + valid payload without category -> 201, category is null", async ({ request }) => {
    const payload = validPayload();
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    createdTicketIds.push(body.ticket.id);

    expect(typeof body.ticket.id).toBe("number");
    expect(body.ticket.subject).toBe(payload.subject);
    expect(body.ticket.status).toBe("OPEN");
    expect(body.ticket.category).toBeNull();
    expect(body.ticket.fromEmail).toBe(payload.fromEmail);
    expect(body.ticket.fromName).toBe(payload.fromName);
    expect(body.ticket.body).toBe(payload.body);
    expect(body.ticket.bodyHtml).toBeNull();
    expect(body.ticket.assignedToId).toBeNull();
    expect(typeof body.ticket.createdAt).toBe("string");
    expect(typeof body.ticket.updatedAt).toBe("string");

    // No unexpected extra/missing fields in the response shape.
    expect(Object.keys(body.ticket).sort()).toEqual(
      [
        "id",
        "subject",
        "status",
        "category",
        "fromEmail",
        "fromName",
        "body",
        "bodyHtml",
        "assignedToId",
        "createdAt",
        "updatedAt",
      ].sort(),
    );

    // Confirm the webhook actually persisted a row — read it back straight from the test DB
    // (bypassing the HTTP response entirely) rather than just trusting the 201 body's shape.
    const dbRow = await getTicketById(body.ticket.id);
    expect(dbRow).not.toBeNull();
    expect(dbRow?.subject).toBe(payload.subject);
    expect(dbRow?.status).toBe("OPEN");
    expect(dbRow?.category).toBeNull();
    expect(dbRow?.fromEmail).toBe(payload.fromEmail);
    expect(dbRow?.fromName).toBe(payload.fromName);
    expect(dbRow?.body).toBe(payload.body);
    expect(dbRow?.bodyHtml).toBeNull();
    expect(dbRow?.assignedToId).toBeNull();
  });

  test("valid secret + payload with bodyHtml -> 201, bodyHtml is echoed back", async ({ request }) => {
    const payload = validPayload({ bodyHtml: "<p>My order hasn't arrived yet.</p>" });
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    createdTicketIds.push(body.ticket.id);
    expect(body.ticket.bodyHtml).toBe(payload.bodyHtml);

    const dbRow = await getTicketById(body.ticket.id);
    expect(dbRow?.bodyHtml).toBe(payload.bodyHtml);
  });

  test("valid secret + valid payload with category -> 201, category reflects given value", async ({ request }) => {
    const payload = validPayload({ category: "TECHNICAL_QUESTION" });
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    createdTicketIds.push(body.ticket.id);
    expect(body.ticket.category).toBe("TECHNICAL_QUESTION");
  });

  test("missing Authorization header -> 401 Unauthorized", async ({ request }) => {
    const res = await request.post(INBOUND_EMAIL_API, { data: validPayload() });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("wrong secret -> 401 Unauthorized", async ({ request }) => {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader("this-is-not-the-secret"),
      data: validPayload(),
    });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("invalid fromEmail format -> 400", async ({ request }) => {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: validPayload({ fromEmail: "not-an-email" }),
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Enter a valid email address" });
  });

  test("missing subject -> 400", async ({ request }) => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).subject;

    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  test("missing fromName -> 400", async ({ request }) => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).fromName;

    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  test("empty-string body -> 201 (empty body is intentionally accepted)", async ({ request }) => {
    const payload = validPayload({ body: "" });
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: payload,
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    createdTicketIds.push(body.ticket.id);
    expect(body.ticket.body).toBe("");
  });

  test("invalid category value -> 400", async ({ request }) => {
    const res = await request.post(INBOUND_EMAIL_API, {
      headers: authHeader(WEBHOOK_SECRET),
      data: validPayload({ category: "NOT_A_REAL_CATEGORY" }),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });
});
