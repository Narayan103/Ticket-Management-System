import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be set — copy e2e/.env.example to e2e/.env");
}

const dbName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
const adminUrl = new URL(testDatabaseUrl);
adminUrl.pathname = "/postgres";

const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();
const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
if (rows.length === 0) {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Created database "${dbName}"`);
} else {
  console.log(`Database "${dbName}" already exists`);
}
await admin.end();

const serverDir = path.resolve(__dirname, "../server");
await new Promise<void>((resolve, reject) => {
  const child = spawn("bunx", ["prisma", "migrate", "deploy"], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited with code ${code}`)),
  );
});

console.log("Test database schema is up to date.");

// Seed the fixed E2E test accounts (ADMIN + AGENT). There's no self-registration
// (disableSignUp: true), so tests need real, pre-existing credentials to sign in with.
// Runs with cwd = server/ so it resolves server's node_modules/generated Prisma client,
// same as the `prisma migrate deploy` invocation above.
await new Promise<void>((resolve, reject) => {
  const child = spawn("bun", ["../e2e/seed-test-users.ts"], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`seed-test-users.ts exited with code ${code}`)),
  );
});

console.log("Test database seeded with E2E test accounts.");
