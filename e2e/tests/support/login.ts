import { expect, type Page } from "@playwright/test";

/** Fills and submits the login form via the real UI, then waits for the post-login redirect. */
export async function loginViaUi(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
}
