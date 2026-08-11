import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER } from "./support/test-users";

test.describe("session lifecycle", () => {
  test("sign out clears the session server-side, not just client-side navigation", async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    // If sign-out only navigated client-side without actually clearing the session cookie,
    // this second visit to a protected route would still succeed. /dashboard (not /, which is
    // now the public landing page and would redirect regardless of session state) is the one
    // that actually proves the server-side session was cleared.
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("session persists across a full page reload", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // The sidebar footer renders the signed-in user's name from session data — still visible
    // after reload proves the session was actually restored, not just the last render kept around.
    await expect(page.getByText(ADMIN_USER.name)).toBeVisible();
  });
});
