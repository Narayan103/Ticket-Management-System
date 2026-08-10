import { PgBoss } from "pg-boss";

export const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });

// PgBoss extends EventEmitter; an unhandled "error" event would otherwise crash the process.
boss.on("error", (error) => {
  console.error("pg-boss error:", error);
});
