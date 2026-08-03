import { Client } from "pg";

// Used only to clean up users created through the "Create User" flow in
// create-user.spec.ts. There's no DELETE /api/users route (out of scope for this feature),
// and this suite's DB is never dropped/recreated between runs (setup-test-db.ts only creates
// it if missing and applies migrations) — so tests that create real rows must delete them
// themselves, or repeated runs would collide on the unique `email` constraint and
// users-list.spec.ts's exact-row-count assertion would flake against leftover data.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be set — copy e2e/.env.example to e2e/.env");
}

/** Deletes an AuthUser by email. AuthAccount/AuthSession rows cascade via onDelete: Cascade. */
export async function deleteUserByEmail(email: string): Promise<void> {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    await client.query('DELETE FROM "AuthUser" WHERE email = $1', [email]);
  } finally {
    await client.end();
  }
}
