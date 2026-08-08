import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../require-webhook-secret";
import { validateBody } from "../lib/validate";
import { db } from "../db";

export const inboundEmailRouter = Router();

inboundEmailRouter.post("/", requireWebhookSecret, async (req, res) => {
  const parsed = validateBody(inboundEmailSchema, req.body, res);
  if (!parsed) return;
  const { fromEmail, fromName, subject, body, bodyHtml, category } = parsed;

  const ticket = await db.ticket.create({
    data: { subject, fromEmail, fromName, body, bodyHtml, category },
  });

  res.status(201).json({ ticket });
});
