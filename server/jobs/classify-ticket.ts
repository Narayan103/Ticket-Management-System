import * as Sentry from "@sentry/bun";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { ticketCategorySchema } from "core";
import { boss } from "../queue";
import { db } from "../db";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

interface ClassifyTicketJob {
  ticketId: number;
  subject: string;
  body: string;
}

export async function queueTicketClassification(ticketId: number, subject: string, body: string) {
  await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId, subject, body } satisfies ClassifyTicketJob);
}

export async function startClassifyTicketWorker() {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE, { retryLimit: 2, retryDelay: 30 });

  await boss.work<ClassifyTicketJob>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    if (!job) return;
    const { ticketId, subject, body } = job.data;

    try {
      const { object: category } = await generateObject({
        model: google("gemini-3.1-flash-lite"),
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
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}
