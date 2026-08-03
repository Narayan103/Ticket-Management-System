import { auth } from "../auth";
import { Role } from "../types/role";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
}

const ctx = await auth.$context;

const existing = await ctx.internalAdapter.findUserByEmail(email);
if (existing) {
  console.log(`Admin user ${email} already exists, skipping.`);
  process.exit(0);
}

const hashedPassword = await ctx.password.hash(password);

const user = await ctx.internalAdapter.createUser({
  email,
  name: "Admin",
  role: Role.ADMIN,
  emailVerified: true,
});

await ctx.internalAdapter.linkAccount({
  userId: user.id,
  providerId: "credential",
  accountId: user.id,
  password: hashedPassword,
});

console.log(`Seeded admin user: ${email}`);
process.exit(0);
