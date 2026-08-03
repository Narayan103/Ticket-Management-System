// Seeds fixed, idempotent test accounts (one ADMIN, one AGENT) into the e2e test database.
//
// There is no self-registration (`disableSignUp: true` in server/auth.ts), so E2E tests can't
// sign up a user through the UI — they need accounts that already exist. This mirrors
// server/prisma/seed.ts (which seeds the real dev-DB admin from SEED_ADMIN_EMAIL/PASSWORD),
// but creates two throwaway, test-DB-only accounts from e2e/.env instead.
//
// Invoked by setup-test-db.ts (cwd = server/) after migrations run, so the relative import
// below resolves against server/node_modules and DATABASE_URL/CLIENT_URL are already the
// test-DB values injected by playwright.config.ts's webServer env.
import { auth } from "../server/auth";
import { Role } from "../server/types/role";

const testUsers = [
  {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    name: "E2E Admin",
    role: Role.ADMIN,
  },
  {
    email: process.env.E2E_AGENT_EMAIL,
    password: process.env.E2E_AGENT_PASSWORD,
    name: "E2E Agent",
    role: Role.AGENT,
  },
] as const;

for (const u of testUsers) {
  if (!u.email || !u.password) {
    throw new Error(
      `E2E_${u.role}_EMAIL and E2E_${u.role}_PASSWORD must be set — copy e2e/.env.example to e2e/.env`,
    );
  }
}

const ctx = await auth.$context;

for (const u of testUsers) {
  const email = u.email as string;
  const password = u.password as string;

  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    console.log(`Test ${u.role} user ${email} already exists, skipping.`);
    continue;
  }

  const hashedPassword = await ctx.password.hash(password);

  const user = await ctx.internalAdapter.createUser({
    email,
    name: u.name,
    role: u.role,
    emailVerified: true,
  });

  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hashedPassword,
  });

  console.log(`Seeded test ${u.role} user: ${email}`);
}

process.exit(0);
