import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";
import { deleteUserByEmail } from "./support/db";

// Emails created by these tests are unique per run (worker index + timestamp) so repeated
// suite runs never collide on the AuthUser.email unique constraint, and are deleted in
// afterEach so leftover rows can't affect other spec files (e.g. users-list.spec.ts's
// exact-row-count assertion) when tests run in parallel across files.
function uniqueEmail(workerIndex: number) {
  return `e2e-create-user-${workerIndex}-${Date.now()}@example.com`;
}

const CREATE_USERS_API_PATH = "/api/users";

test.describe("Create User modal", () => {
  const createdEmails: string[] = [];

  test.afterEach(async () => {
    while (createdEmails.length > 0) {
      const email = createdEmails.pop()!;
      await deleteUserByEmail(email);
    }
  });

  test("Create User button opens the modal with all three fields", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Create User" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Create User" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("name under 3 characters shows a validation error and sends no request", async ({
    page,
  }) => {
    let requested = false;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes(CREATE_USERS_API_PATH)) requested = true;
    });

    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    await page.getByLabel("Name").fill("Al");
    await page.getByLabel("Email").fill(uniqueEmail(test.info().workerIndex));
    await page.getByLabel("Password").fill("validpassword123");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();

    await expect(page.getByText("Name must be at least 3 characters")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(requested).toBe(false);
  });

  test("invalid email format shows a validation error and sends no request", async ({ page }) => {
    let requested = false;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes(CREATE_USERS_API_PATH)) requested = true;
    });

    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    await page.getByLabel("Name").fill("Alice Example");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("validpassword123");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(requested).toBe(false);
  });

  test("password under 8 characters shows a validation error and sends no request", async ({
    page,
  }) => {
    let requested = false;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes(CREATE_USERS_API_PATH)) requested = true;
    });

    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    await page.getByLabel("Name").fill("Alice Example");
    await page.getByLabel("Email").fill(uniqueEmail(test.info().workerIndex));
    await page.getByLabel("Password").fill("short1");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();

    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(requested).toBe(false);
  });

  test("valid submission creates the user, closes the modal, and the user appears in the list without a reload", async ({
    page,
  }) => {
    const email = uniqueEmail(test.info().workerIndex);
    createdEmails.push(email);

    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    await page.getByLabel("Name").fill("Newly Created Agent");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("validpassword123");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();

    const table = page.getByRole("table");
    const newRow = table.getByRole("row", { name: /Newly Created Agent/ });
    await expect(newRow.getByRole("cell", { name: "Newly Created Agent", exact: true })).toBeVisible();
    await expect(newRow.getByRole("cell", { name: email, exact: true })).toBeVisible();
    await expect(newRow.getByRole("cell", { name: "AGENT", exact: true })).toBeVisible();
  });

  test("duplicate email shows the server's error message and the modal stays open", async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    await page.goto("/users");
    await page.getByRole("button", { name: "Create User" }).click();

    await page.getByLabel("Name").fill("Duplicate Attempt");
    await page.getByLabel("Email").fill(ADMIN_USER.email);
    await page.getByLabel("Password").fill("validpassword123");
    await page.getByRole("dialog").getByRole("button", { name: "Create User" }).click();

    await expect(page.getByText("A user with this email already exists")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

// Regression check: /users has more surface area now (the Create User button/modal), but the
// underlying route gating is unchanged — AdminLayout still redirects a non-admin AGENT away
// from /users. This scenario already exists in access-control.spec.ts
// ("authenticated AGENT visiting /users directly is redirected to / by AdminLayout"); asserted
// again here, scoped to this feature, so this file stands on its own as a check that the new
// Create User surface didn't loosen the existing admin gate.
test("non-admin AGENT cannot reach /users", async ({ page }) => {
  await loginViaUi(page, AGENT_USER);
  await page.goto("/users");
  await expect(page).toHaveURL("/");
});
