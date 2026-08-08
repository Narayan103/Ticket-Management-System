import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { INBOUND_EMAIL_WEBHOOK_SECRET } from "./env";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!provided || !safeCompare(provided, INBOUND_EMAIL_WEBHOOK_SECRET)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
