import { Client } from "pg";

// Used to clean up users created (and, since delete-user.spec.ts, soft-deleted) by these
// tests. This is a hard delete straight against the test DB, deliberately bypassing the
// DELETE /api/users/:id route (which only sets deletedAt and rewrites the email) - and this
// suite's DB is never dropped/recreated between runs (setup-test-db.ts only creates it if
// missing and applies migrations) — so tests that create real rows must delete them
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

/**
 * Deletes a Ticket by id. There's no DELETE /api/tickets/:id route (no ticket UI/API exists
 * yet), so tests that create tickets via POST /api/inbound-email must clean them up directly
 * against the test DB, or repeated runs would accumulate rows. Ticket.id is a plain
 * autoincrementing integer, not a generated-unique value like the emails used for users, so
 * callers must track and pass back the id each created row was assigned.
 */
export async function deleteTicketById(id: number): Promise<void> {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    await client.query('DELETE FROM "Ticket" WHERE id = $1', [id]);
  } finally {
    await client.end();
  }
}

/**
 * Reads a Ticket row directly from the test DB by id, bypassing the HTTP response entirely.
 * Used to confirm POST /api/inbound-email actually persists a row (not just that the response
 * body looks right) — a webhook could in principle return a well-shaped 201 without writing
 * anything. Returns null if no such row exists.
 */
export async function getTicketById(id: number): Promise<Record<string, unknown> | null> {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT * FROM "Ticket" WHERE id = $1', [id]);
    return rows[0] ?? null;
  } finally {
    await client.end();
  }
}
