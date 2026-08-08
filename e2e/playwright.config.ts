import "dotenv/config";
import { defineConfig } from "@playwright/test";

const SERVER_PORT = process.env.SERVER_PORT ?? "3002";
const CLIENT_PORT = process.env.CLIENT_PORT ?? "4300";
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be set — copy e2e/.env.example to e2e/.env");
}

const inboundEmailWebhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
if (!inboundEmailWebhookSecret) {
  throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET must be set — copy e2e/.env.example to e2e/.env");
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
  },
  webServer: [
    {
      // Chained (rather than a Playwright `globalSetup`) because `webServer` is not
      // guaranteed to wait for `globalSetup` to finish — they can race, and this
      // server would otherwise try to query the test DB before it exists.
      command: "bun ../e2e/setup-test-db.ts && bun run start",
      cwd: "../server",
      url: `${SERVER_URL}/api/health`,
      env: {
        DATABASE_URL: testDatabaseUrl,
        PORT: SERVER_PORT,
        CLIENT_URL,
        INBOUND_EMAIL_WEBHOOK_SECRET: inboundEmailWebhookSecret,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `bun run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: "../client",
      url: CLIENT_URL,
      env: {
        VITE_API_URL: SERVER_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
