import { Router } from "express";
import { listTicketsQuerySchema } from "core";
import { requireAuth } from "../require-auth";
import { db } from "../db";

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
      assignedTo: { select: { name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({ ticket });
});
