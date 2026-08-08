import { Router } from "express";
import { listTicketsQuerySchema, updateTicketSchema } from "core";
import { requireAuth } from "../require-auth";
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

ticketsRouter.get("/", requireAuth, async (req, res) => {
  const parsed = listTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { sortBy = "createdAt", sortOrder = "desc", status, category, search, page = 1 } = parsed.data;

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
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

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
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({ ticket });
});

ticketsRouter.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { status, category, assignedToId } = parsed.data;

  // Only admins may (re)assign a ticket — status/category can be changed by any
  // signed-in agent or admin, matching project-scope.md's "agents manage tickets".
  if (assignedToId !== undefined && req.user?.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const existing = await db.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

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
