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
    // this second visit to a protected route would still succeed.
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("session persists across a full page reload", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    // NavBar's <header> is the accessible "banner" landmark — scope to it since the
    // user's name also appears (styled differently) inside the welcome heading itself.
    await expect(page.getByRole("banner").getByText(ADMIN_USER.name)).toBeVisible();
  });
});
