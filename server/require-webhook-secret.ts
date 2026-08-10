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
  const headerSecret = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  // SendGrid's Inbound Parse settings only accept a destination URL, with no way to attach a
  // custom header — so its requests can only carry the secret as ?secret= on that URL. The
  // Authorization header stays supported for callers that can set headers directly (curl, e2e).
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : undefined;
  const provided = headerSecret ?? querySecret;

  if (!provided || !safeCompare(provided, INBOUND_EMAIL_WEBHOOK_SECRET)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
