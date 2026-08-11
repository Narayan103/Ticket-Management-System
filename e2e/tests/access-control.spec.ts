import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER } from "./support/test-users";

test.describe("route protection", () => {
  // / is public (LandingPage) as of the routing restructure — /dashboard is now the protected
  // home, so this is the route-gating assertion that used to live at "/". Landing-page-specific
  // behavior (unauthenticated visitors seeing the public page, authenticated visitors being
  // bounced off it) lives in landing.spec.ts instead, since it's about LandingPage's own
  // session-redirect logic, not generic protected-route gating.
  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated visit to /users redirects to /login (ProtectedLayout wins over AdminLayout)", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated visit to an unknown path redirects to /login (via /dashboard then ProtectedLayout)", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL("/login");
  });

  test("authenticated AGENT visiting /users directly is redirected to /dashboard by AdminLayout", async ({
    page,
  }) => {
    await loginViaUi(page, AGENT_USER);
    await page.goto("/users");
    await expect(page).toHaveURL("/dashboard");
  });

  test("unauthenticated visit to /tickets redirects to /login", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL("/login");
  });

  // /tickets sits inside ProtectedLayout only (not AdminLayout, unlike /users) — both roles
  // must be able to reach it. This is the deliberate behavioral contrast with /users above.
  test("authenticated AGENT visiting /tickets directly is NOT redirected away", async ({ page }) => {
    await loginViaUi(page, AGENT_USER);
    await page.goto("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
  });

  test("authenticated ADMIN visiting /tickets directly is NOT redirected away", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);
    await page.goto("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
  });
});
