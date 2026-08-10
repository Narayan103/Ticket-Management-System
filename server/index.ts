import "./instrument";

import { existsSync } from "fs";
import path from "path";
import * as Sentry from "@sentry/bun";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { CLIENT_URL } from "./env";
import { requireAuth } from "./require-auth";
import { db } from "./db";
import { boss } from "./queue";
import { startClassifyTicketWorker } from "./jobs/classify-ticket";
import { startAutoResolveTicketWorker } from "./jobs/auto-resolve-ticket";
import { usersRouter } from "./routes/users";
import { inboundEmailRouter } from "./routes/inbound-email";
import { ticketsRouter } from "./routes/tickets";

await boss.start();
await startClassifyTicketWorker();
await startAutoResolveTicketWorker();

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

app.use("/api/users", usersRouter);
app.use("/api/inbound-email", inboundEmailRouter);
app.use("/api/tickets", ticketsRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "ok", database: "unreachable" });
  }
});

// Serves the built client (see DEPLOYMENT.md) so this one service handles both
// the API and the SPA. Only registered when a build actually exists, so local
// dev (where the client runs separately via `vite dev`) is unaffected.
const clientDistDir = path.join(import.meta.dir, "../client/dist");
const clientIndexHtml = path.join(clientDistDir, "index.html");

if (existsSync(clientIndexHtml)) {
  app.use(express.static(clientDistDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(clientIndexHtml);
  });
}

Sentry.setupExpressErrorHandler(app);

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
