import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER } from "./support/test-users";

// LandingPage's own useSession + <Navigate> redirect logic (real session-cookie-dependent
// behavior, same pattern as LoginPage's reverse case) — not covered by a component test since
// that would require faking a session rather than a real cookie. Static marketing copy/layout
// is deliberately left untested here; only the session-gated rendering and the login navigation
// need a real browser/server.
test.describe("landing page", () => {
  test("unauthenticated visitor sees the public landing page and can navigate to /login", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Sahyog" })).toBeVisible();

    await page.getByRole("link", { name: "Login" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("authenticated visitor hitting / is redirected to /dashboard", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });
});
