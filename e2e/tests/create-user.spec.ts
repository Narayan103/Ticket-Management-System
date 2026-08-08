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

test.describe("Create User modal", () => {
  const createdEmails: string[] = [];

  test.afterEach(async () => {
    while (createdEmails.length > 0) {
      const email = createdEmails.pop()!;
      await deleteUserByEmail(email);
    }
  });

  // Modal-opens-with-fields, and all client-side validation (name/email/password), are already
  // proven by unit tests: CreateUserForm.test.tsx implicitly renders and exercises all three
  // labeled fields in every test, and covers each validation message + "blocks submission"
  // behavior directly; UsersPage.test.tsx separately proves clicking "Create User" opens a
  // dialog containing the real (unmocked) CreateUserForm. No need to re-drive those same
  // interactions through a real browser here.

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
