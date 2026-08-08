import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../require-webhook-secret";
import { db } from "../db";

export const inboundEmailRouter = Router();

inboundEmailRouter.post("/", requireWebhookSecret, async (req, res) => {
  const parsed = inboundEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { fromEmail, fromName, subject, body, bodyHtml, category } = parsed.data;

  const ticket = await db.ticket.create({
    data: { subject, fromEmail, fromName, body, bodyHtml, category },
  });

  res.status(201).json({ ticket });
});
