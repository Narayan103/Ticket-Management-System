import { Router, type Request, type Response } from "express";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { listTicketsQuerySchema, updateTicketSchema, createReplySchema } from "core";
import { requireAuth } from "../require-auth";
import { validateBody } from "../lib/validate";
import { sendTicketReplyEmail } from "../lib/send-email";
import { db } from "../db";
import { Role } from "../types/role";
import type { TicketStatus } from "../generated/prisma/client";

const HIDDEN_TICKET_STATUSES: TicketStatus[] = ["NEW", "PROCESSING"];

export const ticketsRouter = Router();

const PAGE_SIZE = 10;

function buildOrderBy(sortBy: "subject" | "fromName" | "category" | "status" | "createdAt", sortOrder: "asc" | "desc") {
  switch (sortBy) {
    case "subject":
      return { subject: sortOrder };
    case "fromName":
      return { fromName: sortOrder };
    case "category":
      return { category: sortOrder };
    case "status":
      return { status: sortOrder };
    case "createdAt":
      return { createdAt: sortOrder };
  }
}

function parseTicketId(req: Request, res: Response): number | undefined {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid ticket id" });
    return undefined;
  }
  return id;
}

async function getTicketOrNotFound(
  id: number,
  res: Response,
): Promise<{ id: number; fromEmail: string; subject: string } | undefined> {
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true, fromEmail: true, subject: true } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return undefined;
  }
  return ticket;
}

ticketsRouter.get("/", requireAuth, async (req, res) => {
  const parsed = validateBody(listTicketsQuerySchema, req.query, res);
  if (!parsed) return;
  const { sortBy = "createdAt", sortOrder = "desc", status, category, search, page = 1 } = parsed;

  const where = {
    // NEW/PROCESSING tickets are still being triaged by the AI pipeline and aren't yet
    // actionable, so they're hidden unless a status filter explicitly asks for them.
    ...(status ? { status } : { status: { notIn: HIDDEN_TICKET_STATUSES } }),
    ...(category === "UNCLASSIFIED" ? { category: null } : category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { fromName: { contains: search, mode: "insensitive" as const } },
            { fromEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tickets, totalCount] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        fromEmail: true,
        fromName: true,
        createdAt: true,
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.ticket.count({ where }),
  ]);
  res.json({ tickets, totalCount, page, pageSize: PAGE_SIZE });
});

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  averageResolutionSeconds: number | null;
  ticketsPerDay: { date: string; count: number }[];
}

ticketsRouter.get("/stats", requireAuth, async (req, res) => {
  // All the aggregation (including the HIDDEN_TICKET_STATUSES equivalent) lives in the
  // get_ticket_stats() Postgres function — see its migration for the SQL.
  const rows = await db.$queryRaw<{ stats: TicketStats }[]>`SELECT get_ticket_stats() AS stats`;
  res.json(rows[0]!.stats);
});

ticketsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = parseTicketId(req, res);
  if (id === undefined) return;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      fromEmail: true,
      fromName: true,
      body: true,
      bodyHtml: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          senderType: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({ ticket });
});

ticketsRouter.patch("/:id", requireAuth, async (req, res) => {
  const id = parseTicketId(req, res);
  if (id === undefined) return;

  const parsed = validateBody(updateTicketSchema, req.body, res);
  if (!parsed) return;
  const { status, category, assignedToId } = parsed;

  // Only admins may (re)assign a ticket — status/category can be changed by any
  // signed-in agent or admin, matching project-scope.md's "agents manage tickets".
  if (assignedToId !== undefined && req.user?.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!(await getTicketOrNotFound(id, res))) return;

  if (assignedToId !== undefined && assignedToId !== null) {
    const agent = await db.authUser.findUnique({ where: { id: assignedToId }, select: { deletedAt: true, role: true } });
    if (!agent || agent.deletedAt || agent.role !== Role.AGENT) {
      res.status(400).json({ error: "Assignee must be an active agent" });
      return;
    }
  }

  const ticket = await db.ticket.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      // Track when a ticket became resolved for average-resolution-time reporting; clear it on
      // reopen so a stale timestamp doesn't linger. Leave untouched on a CLOSED transition so
      // closing a resolved ticket doesn't erase when it was actually resolved.
      ...(status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
      ...(status === "OPEN" ? { resolvedAt: null } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
    },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      fromEmail: true,
      fromName: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true } },
    },
  });

  res.json({ ticket });
});

ticketsRouter.post("/:id/replies", requireAuth, async (req, res) => {
  const id = parseTicketId(req, res);
  if (id === undefined) return;

  const ticket = await getTicketOrNotFound(id, res);
  if (!ticket) return;

  const parsed = validateBody(createReplySchema, req.body, res);
  if (!parsed) return;

  const reply = await db.reply.create({
    data: {
      ticketId: id,
      authorId: req.user?.id,
      senderType: "AGENT",
      body: parsed.body,
    },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  // The reply is already persisted regardless of whether the email actually goes out, so a
  // send failure is logged rather than failing the response — mirrors the queuing-failure
  // handling in inbound-email.ts.
  try {
    await sendTicketReplyEmail({ to: ticket.fromEmail, subject: ticket.subject, body: parsed.body });
  } catch (error) {
    console.error(`Failed to send reply email for ticket ${id}:`, error);
  }

  res.status(201).json({ reply });
});

ticketsRouter.post("/:id/polish-reply", requireAuth, async (req, res) => {
  const id = parseTicketId(req, res);
  if (id === undefined) return;

  const parsed = validateBody(createReplySchema, req.body, res);
  if (!parsed) return;

  const ticket = await db.ticket.findUnique({ where: { id }, select: { subject: true, body: true, fromName: true } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const customerFirstName = ticket.fromName.trim().split(/\s+/)[0];

  const { text } = await generateText({
    model: google("gemini-3.1-flash-lite"),
    system:
      "You polish customer support agent replies before they are sent to a customer. " +
      "Improve grammar, clarity, and tone while keeping the meaning, facts, and intent unchanged. " +
      "Do not invent new information or answer on the agent's behalf. " +
      "Write in a professional, customer-friendly tone. Format the reply as multiple short paragraphs separated " +
      "by a blank line (an actual newline character between paragraphs, not just a space) — never one long " +
      "paragraph — and use a numbered or bulleted list for any multi-step instructions. " +
      'Open the reply by greeting the customer by the first name given, on its own line (e.g. "Hi Jane," or "Hello Jane,"). ' +
      'End with a blank line followed by a brief, professional sign-off signed as "Code with Narayan Support". ' +
      "Return only the improved reply text, with no preamble, commentary, or quotation marks.",
    prompt:
      `Customer's name: ${customerFirstName}\n` +
      `Customer's ticket subject: ${ticket.subject}\n` +
      `Customer's message: ${ticket.body}\n\n` +
      `Agent's draft reply to polish:\n${parsed.body}`,
  });

  res.json({ body: text });
});

ticketsRouter.post("/:id/summarize", requireAuth, async (req, res) => {
  const id = parseTicketId(req, res);
  if (id === undefined) return;

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      subject: true,
      body: true,
      fromName: true,
      replies: {
        orderBy: { createdAt: "asc" },
        select: { body: true, senderType: true, author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const conversation = [
    `${ticket.fromName} (customer): ${ticket.body}`,
    ...ticket.replies.map((reply) => {
      const speaker = reply.senderType === "AGENT" ? reply.author?.name ?? "Agent" : ticket.fromName;
      return `${speaker} (${reply.senderType.toLowerCase()}): ${reply.body}`;
    }),
  ].join("\n\n");

  const { text } = await generateText({
    model: google("gemini-3.1-flash-lite"),
    system:
      "You summarize customer support ticket conversations for a support agent. " +
      "Write a brief, neutral summary covering what the customer needs, what's been discussed or resolved so far, " +
      "and any open questions or next steps. " +
      "Return only the summary text, with no preamble, commentary, or quotation marks.",
    prompt: `Ticket subject: ${ticket.subject}\n\nConversation so far:\n${conversation}`,
  });

  res.json({ summary: text });
});
