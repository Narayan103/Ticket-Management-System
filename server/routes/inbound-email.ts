import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../require-webhook-secret";
import { validateBody } from "../lib/validate";
import { db } from "../db";
import { queueTicketClassification } from "../jobs/classify-ticket";

export const inboundEmailRouter = Router();

inboundEmailRouter.post("/", requireWebhookSecret, async (req, res) => {
  const parsed = validateBody(inboundEmailSchema, req.body, res);
  if (!parsed) return;
  const { fromEmail, fromName, subject, body, bodyHtml, category } = parsed;

  const ticket = await db.ticket.create({
    data: { subject, fromEmail, fromName, body, bodyHtml, category },
  });

  if (!category) {
    // Queuing (a fast DB insert) is awaited, but classification itself runs later in the
    // worker — this doesn't wait on the model, and the job survives a server restart.
    try {
      await queueTicketClassification(ticket.id, subject, body);
    } catch (error) {
      console.error(`Failed to queue classification for ticket ${ticket.id}:`, error);
    }
  }

  res.status(201).json({ ticket });
});
