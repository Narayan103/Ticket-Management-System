import { expect, test, type Page } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER } from "./support/test-users";
import { deleteUserByEmail } from "./support/db";

// /api/users lives on the server, not the client (baseURL) - same reasoning as
// users-list.spec.ts / edit-user.spec.ts. Used here both to create disposable "delete target"
// users directly via API (page.request shares the admin session cookie set by loginViaUi) and,
// in the second test, to drive the delete itself via API so that test can focus on the
// post-delete consequences (sign-in rejection, email reuse) rather than re-testing the UI flow
// already covered by the first test.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const USERS_API = `${SERVER_URL}/api/users`;

const DEFAULT_PASSWORD = "originalpassword123";

// Emails are unique per run (worker index + timestamp + a label) so repeated suite runs never
// collide on the AuthUser.email unique constraint.
function uniqueEmail(label: string, workerIndex: number) {
  return `e2e-delete-user-${label}-${workerIndex}-${Date.now()}@example.com`;
}

type TestUser = { name: string; email: string; password: string };

/** Creates a disposable user via a direct API call (requires an already-logged-in admin `page`). */
async function createTestUser(page: Page, label: string): Promise<TestUser> {
  const name = `Delete Target ${label}`;
  const email = uniqueEmail(label, test.info().workerIndex);
  const password = DEFAULT_PASSWORD;

  const res = await page.request.post(USERS_API, { data: { name, email, password } });
  expect(res.status()).toBe(201);

  return { name, email, password };
}

test.describe("Delete User", () => {
  test("clicking the delete button and confirming removes the user from the table without a reload, and the user is confirmed gone", async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    const user = await createTestUser(page, "ui-flow");

    // No deleteUserByEmail cleanup needed for this user: a successful delete below soft-deletes
    // the row and rewrites its email to `deleted+<id>+<original email>`, so the original email
    // (the only one tracked here) is never reused and can't collide with future runs.

    await page.goto("/users");
    const table = page.getByRole("table");
    const row = table.getByRole("row", { name: new RegExp(user.name) });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: `Delete ${user.name}` }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Delete User" })).toBeVisible();
    await expect(dialog).toContainText(user.name);

    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(table.getByRole("row", { name: new RegExp(user.name) })).not.toBeVisible();

    // Confirm it's really gone, not just removed from the client's view: re-fetch the list from
    // the server (GET /api/users filters on deletedAt: null).
    const res = await page.request.get(USERS_API);
    const { users } = await res.json();
    expect(users.some((u: { email: string }) => u.email === user.email)).toBe(false);
  });

  test("after deletion, the user can no longer sign in with their original credentials, and their freed email can be reused to create a new user", async ({
    page,
    browser,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    const user = await createTestUser(page, "post-delete");

    const listRes = await page.request.get(USERS_API);
    const { users } = await listRes.json();
    const created = users.find((u: { email: string }) => u.email === user.email);
    expect(created).toBeTruthy();

    const deleteRes = await page.request.delete(`${USERS_API}/${created.id}`);
    expect(deleteRes.status()).toBe(204);

    // The deleted user's original credentials no longer work. Fresh browser context so this
    // doesn't disturb the admin session driving this test (same isolation pattern as
    // edit-user.spec.ts's password-change checks).
    const failContext = await browser.newContext();
    const failPage = await failContext.newPage();
    await failPage.goto("/login");
    await failPage.getByLabel("Email").fill(user.email);
    await failPage.getByLabel("Password").fill(user.password);
    await failPage.getByRole("button", { name: "Sign in" }).click();
    await expect(failPage.getByRole("alert")).toBeVisible();
    await expect(failPage).toHaveURL("/login");
    await failContext.close();

    // The now-freed email can be used to create a brand new user - regression coverage for a
    // real bug (email mangling on delete frees the slot for reuse).
    const newUserRes = await page.request.post(USERS_API, {
      data: { name: "Reused Email User", email: user.email, password: DEFAULT_PASSWORD },
    });
    expect(newUserRes.status()).toBe(201);

    // Unlike the deleted user above, this new row keeps its original, unmangled email, so
    // (per this file's established convention) it must be explicitly cleaned up.
    await deleteUserByEmail(user.email);
  });
});
