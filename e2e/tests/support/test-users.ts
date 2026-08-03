// Fixed, idempotent test-DB-only accounts seeded into ticket_management_test by
// e2e/seed-test-users.ts (invoked from e2e/setup-test-db.ts before the test webServer
// comes up). Credentials live in e2e/.env — see e2e/.env.example.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set — copy e2e/.env.example to e2e/.env`);
  }
  return value;
}

export const ADMIN_USER = {
  email: requireEnv("E2E_ADMIN_EMAIL"),
  password: requireEnv("E2E_ADMIN_PASSWORD"),
  name: "E2E Admin",
};

export const AGENT_USER = {
  email: requireEnv("E2E_AGENT_EMAIL"),
  password: requireEnv("E2E_AGENT_PASSWORD"),
  name: "E2E Agent",
};

// Guaranteed not to exist in the seeded test DB — used for the "unknown email" scenario.
export const NONEXISTENT_USER = {
  email: "does-not-exist@example.com",
  password: "SomeRandomPassword123!",
};
