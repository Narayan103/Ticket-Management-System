import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { CLIENT_URL } from "./env";
import { requireAuth, requireAdmin } from "./require-auth";
import { db } from "./db";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user, session: { expiresAt: req.session!.expiresAt } });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.authUser.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

app.get("/api/health", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "ok", database: "unreachable" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
