import { Router, type Request, type Response } from "express";
import { listTicketsQuerySchema, updateTicketSchema, createReplySchema } from "core";
import { requireAuth } from "../require-auth";
import { validateBody } from "../lib/validate";
import { db } from "../db";
import { Role } from "../types/role";

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

async function getTicketOrNotFound(id: number, res: Response): Promise<{ id: number } | undefined> {
  const ticket = await db.ticket.findUnique({ where: { id }, select: { id: true } });
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
    ...(status ? { status } : {}),
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

  if (!(await getTicketOrNotFound(id, res))) return;

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

  res.status(201).json({ reply });
});
