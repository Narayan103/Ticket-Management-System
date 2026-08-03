import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";

// /api/users lives on the server, not the client (baseURL), and the test process inherits
// SERVER_PORT from e2e/.env via playwright.config.ts's `dotenv/config` import.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const USERS_API = `${SERVER_URL}/api/users`;

test.describe("/users page content", () => {
  test("renders both seeded users' data in the correct columns", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");

    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    const adminRow = table.getByRole("row", { name: new RegExp(ADMIN_USER.name) });
    await expect(adminRow.getByRole("cell", { name: ADMIN_USER.name, exact: true })).toBeVisible();
    await expect(adminRow.getByRole("cell", { name: ADMIN_USER.email, exact: true })).toBeVisible();
    await expect(adminRow.getByRole("cell", { name: "ADMIN", exact: true })).toBeVisible();
    // Joined date: don't assert an exact string (locale/timezone-dependent formatting via
    // toLocaleDateString), just that a non-empty value is rendered in the 4th cell.
    await expect(adminRow.getByRole("cell").nth(3)).not.toBeEmpty();

    const agentRow = table.getByRole("row", { name: new RegExp(AGENT_USER.name) });
    await expect(agentRow.getByRole("cell", { name: AGENT_USER.name, exact: true })).toBeVisible();
    await expect(agentRow.getByRole("cell", { name: AGENT_USER.email, exact: true })).toBeVisible();
    await expect(agentRow.getByRole("cell", { name: "AGENT", exact: true })).toBeVisible();
    await expect(agentRow.getByRole("cell").nth(3)).not.toBeEmpty();

    // Sorted alphabetically by name: "E2E Admin" before "E2E Agent".
    const rows = table.getByRole("row");
    await expect(rows).toHaveCount(3); // header + 2 data rows
    await expect(rows.nth(1)).toContainText(ADMIN_USER.name);
    await expect(rows.nth(2)).toContainText(AGENT_USER.name);
  });
});

test.describe("GET /api/users authorization", () => {
  test("no session -> 401 Unauthorized", async ({ request }) => {
    const res = await request.get(USERS_API);
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("AGENT session -> 403 Forbidden", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    const res = await page.request.get(USERS_API);
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  test("ADMIN session -> 200 with exactly the expected user shape", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    const res = await page.request.get(USERS_API);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.users).toHaveLength(2);

    const [first, second] = body.users;
    expect(first.name).toBe(ADMIN_USER.name);
    expect(first.email).toBe(ADMIN_USER.email);
    expect(first.role).toBe("ADMIN");
    expect(second.name).toBe(AGENT_USER.name);
    expect(second.email).toBe(AGENT_USER.email);
    expect(second.role).toBe("AGENT");

    // No extra fields leaking through (e.g. emailVerified, image, updatedAt) beyond the
    // documented { id, name, email, role, createdAt } shape.
    for (const user of body.users) {
      expect(Object.keys(user).sort()).toEqual(
        ["createdAt", "email", "id", "name", "role"].sort(),
      );
      expect(typeof user.id).toBe("string");
      expect(typeof user.createdAt).toBe("string");
    }
  });
});
