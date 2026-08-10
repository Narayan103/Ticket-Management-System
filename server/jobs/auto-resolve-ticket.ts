import * as Sentry from "@sentry/bun";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { boss } from "../queue";
import { db } from "../db";
import { KNOWLEDGE_BASE } from "../lib/knowledge-base";
import { sendTicketReplyEmail } from "../lib/send-email";

export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

interface AutoResolveTicketJob {
  ticketId: number;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
}

const resolutionSchema = z.object({
  canResolve: z.boolean(),
  reply: z.string(),
});

export async function queueTicketAutoResolution(
  ticketId: number,
  fromEmail: string,
  fromName: string,
  subject: string,
  body: string,
) {
  await boss.send(AUTO_RESOLVE_TICKET_QUEUE, { ticketId, fromEmail, fromName, subject, body } satisfies AutoResolveTicketJob);
}

export async function startAutoResolveTicketWorker() {
  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE, { retryLimit: 2, retryDelay: 30 });

  await boss.work<AutoResolveTicketJob>(AUTO_RESOLVE_TICKET_QUEUE, async ([job]) => {
    if (!job) return;
    const { ticketId, fromEmail, fromName, subject, body } = job.data;

    // NEW -> PROCESSING while the model is working. If anything below throws (including a
    // pg-boss retry attempt), the catch moves the ticket back to OPEN rather than leaving
    // it stuck in PROCESSING and hidden from the agent-facing list.
    await db.ticket.update({ where: { id: ticketId }, data: { status: "PROCESSING" } });

    try {
      const { object } = await generateObject({
        model: google("gemini-3.1-flash-lite"),
        schema: resolutionSchema,
        system:
          "You are a customer support assistant who resolves support tickets automatically, using ONLY the knowledge " +
          "base below. Set canResolve to true only if the knowledge base fully and confidently answers the customer's " +
          "request without needing a human agent, and follow the knowledge base's own escalation rules exactly " +
          "(section 10) — if any escalation rule applies, or you're not fully confident, set canResolve to false. " +
          "When canResolve is true, write a complete reply that fully resolves their request using only information " +
          "from the knowledge base. Use a professional, customer-friendly tone. Format the reply as multiple short " +
          "paragraphs separated by a blank line (an actual newline character between paragraphs, not just a space) " +
          "— never one long paragraph — and use a numbered or bulleted list for any multi-step instructions. Open " +
          'by greeting the customer by their first name on its own line (e.g. "Hi Jane," or "Hello Jane,"), and end with a blank line followed by a ' +
          'brief, professional sign-off signed as "Code with Narayan Support". ' +
          "When canResolve is false, set reply to an empty string.\n\n" +
          `Knowledge base:\n${KNOWLEDGE_BASE}`,
        prompt: `Customer name: ${fromName}\nSubject: ${subject}\nMessage: ${body}`,
      });

      if (object.canResolve && object.reply.trim()) {
        await db.reply.create({ data: { ticketId, senderType: "AI", body: object.reply } });
        await db.ticket.update({ where: { id: ticketId }, data: { status: "RESOLVED", resolvedAt: new Date() } });
        // The ticket is already resolved regardless of whether the email actually goes out, so a
        // send failure is logged rather than thrown — mirrors the queuing-failure handling in
        // inbound-email.ts, and avoids a pg-boss retry re-resolving an already-resolved ticket.
        try {
          await sendTicketReplyEmail({ to: fromEmail, subject, body: object.reply });
        } catch (error) {
          console.error(`Failed to send auto-resolve reply email for ticket ${ticketId}:`, error);
        }
      } else {
        await db.ticket.update({ where: { id: ticketId }, data: { status: "OPEN", resolvedAt: null } });
      }
    } catch (error) {
      Sentry.captureException(error);
      await db.ticket.update({ where: { id: ticketId }, data: { status: "OPEN", resolvedAt: null } });
      throw error;
    }
  });
}
