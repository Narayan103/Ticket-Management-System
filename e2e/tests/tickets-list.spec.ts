import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";

// /api/tickets lives on the server, not the client (baseURL), and the test process inherits
// SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config` import — same pattern
// as users-list.spec.ts / inbound-email.spec.ts.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const TICKETS_API = `${SERVER_URL}/api/tickets`;
const TICKETS_STATS_API = `${SERVER_URL}/api/tickets/stats`;

test.describe("GET /api/tickets authorization", () => {
  test("no session -> 401 Unauthorized", async ({ request }) => {
    const res = await request.get(TICKETS_API);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // Unlike /api/users (admin-only), /api/tickets is intentionally viewable by both roles —
  // this is the important contrast with users-list.spec.ts's "AGENT session -> 403" case.
  test("AGENT session -> 200 (tickets are NOT admin-gated, unlike /api/users)", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.get(TICKETS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tickets)).toBe(true);
  });

  test("ADMIN session -> 200", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(TICKETS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tickets)).toBe(true);
  });
});

// Numeric/business-logic correctness (count math, AI-resolution detection, average calc) is
// deliberately out of scope here — that's covered by DashboardPage.test.tsx with a mocked API
// client. The only thing an E2E test can prove that a component test can't is the real server's
// auth enforcement, mirroring the GET /api/tickets block above.
test.describe("GET /api/tickets/stats authorization", () => {
  test("no session -> 401 Unauthorized", async ({ request }) => {
    const res = await request.get(TICKETS_STATS_API);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("AGENT session -> 200 with stats shape (not admin-gated)", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.get(TICKETS_STATS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalTickets");
    expect(body).toHaveProperty("openTickets");
    expect(body).toHaveProperty("aiResolvedTickets");
    expect(body).toHaveProperty("averageResolutionSeconds");
  });

  test("ADMIN session -> 200 with stats shape", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(TICKETS_STATS_API);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalTickets");
    expect(body).toHaveProperty("openTickets");
    expect(body).toHaveProperty("aiResolvedTickets");
    expect(body).toHaveProperty("averageResolutionSeconds");
  });
});
