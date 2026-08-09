import { Router } from "express";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { inboundEmailSchema, ticketCategorySchema } from "core";
import { requireWebhookSecret } from "../require-webhook-secret";
import { validateBody } from "../lib/validate";
import { db } from "../db";

export const inboundEmailRouter = Router();

// Fire-and-forget: the webhook responds as soon as the ticket is created rather than
// waiting on the model, so a slow/failed classification never delays or breaks ingestion.
async function classifyTicket(ticketId: number, subject: string, body: string) {
  const { object: category } = await generateObject({
    model: google("gemini-3.6-flash"),
    output: "enum",
    enum: [...ticketCategorySchema.options, "UNCLASSIFIED" as const],
    system:
      "You classify customer support tickets into the category that best matches the customer's request, " +
      "based on the ticket's subject and body. " +
      "If the ticket is gibberish, spam, or otherwise doesn't clearly fit one of the real categories, " +
      "respond UNCLASSIFIED instead of guessing.",
    prompt: `Subject: ${subject}\n\nBody: ${body}`,
  });

  // UNCLASSIFIED means "leave for a human" — the ticket already has category: null from creation.
  if (category === "UNCLASSIFIED") return;

  await db.ticket.update({ where: { id: ticketId }, data: { category } });
}

inboundEmailRouter.post("/", requireWebhookSecret, async (req, res) => {
  const parsed = validateBody(inboundEmailSchema, req.body, res);
  if (!parsed) return;
  const { fromEmail, fromName, subject, body, bodyHtml, category } = parsed;

  const ticket = await db.ticket.create({
    data: { subject, fromEmail, fromName, body, bodyHtml, category },
  });

  if (!category) {
    classifyTicket(ticket.id, subject, body).catch((error) => {
      console.error(`Failed to auto-classify ticket ${ticket.id}:`, error);
    });
  }

  res.status(201).json({ ticket });
});
