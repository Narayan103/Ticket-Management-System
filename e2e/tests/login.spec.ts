import { expect, test } from "@playwright/test";
import { loginViaUi } from "./support/login";
import { ADMIN_USER, AGENT_USER, NONEXISTENT_USER } from "./support/test-users";

// Not covered here: sign-in rate limiting (server/auth.ts customRules on /sign-in/email,
// max 5/60s). It's a no-op unless NODE_ENV=production, which isn't how this suite's
// webServer runs the API — asserting a 429 would require standing up a separate server
// instance just for that one test, which isn't worth the added complexity.

const SIGN_IN_PATH = "/api/auth/sign-in/email";

test.describe("login form", () => {
  test("empty submit shows both field errors and sends no request", async ({ page }) => {
    let signInRequested = false;
    page.on("request", (req) => {
      if (req.url().includes(SIGN_IN_PATH)) signInRequested = true;
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL("/login");
    expect(signInRequested).toBe(false);
  });

  test("invalid email format shows a field error and sends no request", async ({ page }) => {
    let signInRequested = false;
    page.on("request", (req) => {
      if (req.url().includes(SIGN_IN_PATH)) signInRequested = true;
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("notanemail");
    await page.getByLabel("Password").fill("somepassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).not.toBeVisible();
    await expect(page).toHaveURL("/login");
    expect(signInRequested).toBe(false);
  });

  test("wrong password shows a form-level error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_USER.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows the same error as a wrong password (no account enumeration)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_USER.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const wrongPasswordMessage = await page.getByRole("alert").textContent();
    await expect(page).toHaveURL("/login");

    await page.getByLabel("Email").fill(NONEXISTENT_USER.email);
    await page.getByLabel("Password").fill(NONEXISTENT_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    const unknownEmailMessage = await page.getByRole("alert").textContent();
    await expect(page).toHaveURL("/login");

    expect(unknownEmailMessage).toBe(wrongPasswordMessage);
  });

  test("successful ADMIN login lands on home, shows the Users link, and can reach /users", async ({
    page,
  }) => {
    await loginViaUi(page, ADMIN_USER);

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("successful AGENT login lands on home, hides the Users link, and redirects away from /users", async ({
    page,
  }) => {
    await loginViaUi(page, AGENT_USER);

    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();

    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });

  test("already-authenticated visit to /login redirects to /", async ({ page }) => {
    await loginViaUi(page, ADMIN_USER);

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});
