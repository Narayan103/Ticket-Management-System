import { expect, test, type Page } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";
import { deleteUserByEmail } from "./support/db";

// /api/users lives on the server, not the client (baseURL) - same reasoning as
// users-list.spec.ts. Used here to create disposable "edit target" users directly via API
// instead of going through the Create User UI flow, since these tests are about editing, not
// creation, and page.request shares the admin session cookie set by loginViaUi.
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT ?? "3002"}`;
const USERS_API = `${SERVER_URL}/api/users`;

const DEFAULT_PASSWORD = "originalpassword123";

// Emails are unique per run (worker index + timestamp + a label) so repeated suite runs never
// collide on the AuthUser.email unique constraint, and are deleted in afterEach so leftover
// rows can't affect other spec files (e.g. users-list.spec.ts's exact-row-count assertion)
// when tests run in parallel across files.
function uniqueEmail(label: string, workerIndex: number) {
  return `e2e-edit-user-${label}-${workerIndex}-${Date.now()}@example.com`;
}

type TestUser = { name: string; email: string; password: string };

test.describe("Edit User modal", () => {
  // Tracks the CURRENT email of every user created by a test in this file, so afterEach always
  // deletes by the row's up-to-date email rather than the email it was originally created
  // with - an edit test may change the email, and cleanup has to follow that change or the
  // stale email would never get deleted (and the new one would leak across runs too).
  let activeEmails: string[];

  test.beforeEach(() => {
    activeEmails = [];
  });

  test.afterEach(async () => {
    while (activeEmails.length > 0) {
      await deleteUserByEmail(activeEmails.pop()!);
    }
  });

  /** Creates a disposable user via a direct API call (requires an already-logged-in admin `page`). */
  async function createTestUser(
    page: Page,
    overrides: Partial<TestUser> & { label: string },
  ): Promise<TestUser> {
    const name = overrides.name ?? `Edit Target ${overrides.label}`;
    const email = overrides.email ?? uniqueEmail(overrides.label, test.info().workerIndex);
    const password = overrides.password ?? DEFAULT_PASSWORD;

    const res = await page.request.post(USERS_API, { data: { name, email, password } });
    expect(res.status()).toBe(201);
    activeEmails.push(email);

    return { name, email, password };
  }

  /** Call after an edit that changed a tracked user's email, so afterEach cleans up the new email. */
  function trackEmailChange(oldEmail: string, newEmail: string) {
    const idx = activeEmails.indexOf(oldEmail);
    if (idx !== -1) {
      activeEmails[idx] = newEmail;
    } else {
      activeEmails.push(newEmail);
    }
  }

  async function openEditDialog(page: Page, user: TestUser) {
    await page.goto("/users");
    await page.getByRole("button", { name: `Edit ${user.name}` }).click();
  }

  // The prefill behavior and all client-side validation (name/email/password) are already
  // proven by EditUserForm.test.tsx's unit tests — no need to re-drive those same interactions
  // through a real browser here.

  test("valid name/email edit with an empty password updates the row without a reload, and the original password still works", async ({
    page,
    browser,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    const user = await createTestUser(page, { label: "keep-password" });
    const updatedName = "Edited Without Password Change";
    const updatedEmail = uniqueEmail("keep-password-new", test.info().workerIndex);

    await openEditDialog(page, user);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(updatedName);
    await dialog.getByLabel("Email").fill(updatedEmail);
    // New Password field is left blank on purpose - this is the behavior under test.
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    trackEmailChange(user.email, updatedEmail);

    const table = page.getByRole("table");
    const row = table.getByRole("row", { name: new RegExp(updatedName) });
    await expect(row.getByRole("cell", { name: updatedName, exact: true })).toBeVisible();
    await expect(row.getByRole("cell", { name: updatedEmail, exact: true })).toBeVisible();

    // Crux of the feature: confirm the password was left unchanged by logging in as the edited
    // user with their ORIGINAL password, in a fresh context so it doesn't disturb the admin
    // session used above.
    const verifyContext = await browser.newContext();
    const verifyPage = await verifyContext.newPage();
    await loginViaUi(verifyPage, { email: updatedEmail, password: user.password });
    await verifyContext.close();
  });

  test("valid new password updates the row, and afterward the user can log in with the new password (old password stops working)", async ({
    page,
    browser,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    const user = await createTestUser(page, { label: "change-password" });
    const newPassword = "brandnewpassword123";

    await openEditDialog(page, user);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("New Password").fill(newPassword);
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();

    const table = page.getByRole("table");
    const row = table.getByRole("row", { name: new RegExp(user.name) });
    await expect(row.getByRole("cell", { name: user.name, exact: true })).toBeVisible();

    // New password works, in a fresh context so it doesn't disturb the admin session above.
    const successContext = await browser.newContext();
    const successPage = await successContext.newPage();
    await loginViaUi(successPage, { email: user.email, password: newPassword });
    await successContext.close();

    // Nice-to-have: the old password no longer works.
    const failContext = await browser.newContext();
    const failPage = await failContext.newPage();
    await failPage.goto("/login");
    await failPage.getByLabel("Email").fill(user.email);
    await failPage.getByLabel("Password").fill(user.password);
    await failPage.getByRole("button", { name: "Sign in" }).click();
    await expect(failPage.getByRole("alert")).toBeVisible();
    await expect(failPage).toHaveURL("/login");
    await failContext.close();
  });

  test("changing the email to one already used by a different user shows the server's error and the dialog stays open", async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_USER);
    const userA = await createTestUser(page, { label: "dup-a" });
    const userB = await createTestUser(page, { label: "dup-b" });

    await openEditDialog(page, userA);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(userB.email);
    await dialog.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("A user with this email already exists")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

// Regression check: /users has more surface area now (the per-row Edit button/modal), but the
// underlying route gating is unchanged - AdminLayout still redirects a non-admin AGENT away
// from /users. This is already covered in access-control.spec.ts ("authenticated AGENT visiting
// /users directly is redirected to / by AdminLayout") and re-asserted in create-user.spec.ts for
// that feature; following the same judgment call here so this file also stands on its own as
// proof the new Edit User surface didn't loosen the existing admin gate.
test("non-admin AGENT cannot reach /users", async ({ page }) => {
  await loginViaUi(page, AGENT_USER);
  await page.goto("/users");
  await expect(page).toHaveURL("/");
});
