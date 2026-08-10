import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../require-webhook-secret";
import { validateBody } from "../lib/validate";
import { db } from "../db";
import { queueTicketClassification } from "../jobs/classify-ticket";
import { queueTicketAutoResolution } from "../jobs/auto-resolve-ticket";

export const inboundEmailRouter = Router();

inboundEmailRouter.post("/", requireWebhookSecret, async (req, res) => {
  const parsed = validateBody(inboundEmailSchema, req.body, res);
  if (!parsed) return;
  const { fromEmail, fromName, subject, body, bodyHtml, category } = parsed;

  const ticket = await db.ticket.create({
    data: { subject, fromEmail, fromName, body, bodyHtml, category },
  });

  // Queuing (a fast DB insert) is awaited, but the actual work runs later in a worker —
  // this doesn't wait on the model, and the jobs survive a server restart.
  if (!category) {
    try {
      await queueTicketClassification(ticket.id, subject, body);
    } catch (error) {
      console.error(`Failed to queue classification for ticket ${ticket.id}:`, error);
    }
  }

  try {
    await queueTicketAutoResolution(ticket.id, fromName, subject, body);
  } catch (error) {
    console.error(`Failed to queue auto-resolution for ticket ${ticket.id}:`, error);
  }

  res.status(201).json({ ticket });
});
