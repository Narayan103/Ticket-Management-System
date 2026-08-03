import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { AGENT_USER } from "./support/test-users";

test.describe("route protection", () => {
  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated visit to /users redirects to /login (ProtectedLayout wins over AdminLayout)", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated visit to an unknown path redirects to /login (via / then ProtectedLayout)", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL("/login");
  });

  test("authenticated AGENT visiting /users directly is redirected to / by AdminLayout", async ({
    page,
  }) => {
    await loginViaUi(page, AGENT_USER);
    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });
});
