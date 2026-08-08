import { Router } from "express";
import { listTicketsQuerySchema } from "core";
import { requireAuth } from "../require-auth";
import { db } from "../db";

export const ticketsRouter = Router();

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
  const { sortBy = "createdAt", sortOrder = "desc", status, category, search } = parsed.data;

  const tickets = await db.ticket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category === "UNCLASSIFIED" ? { category: null } : category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" } },
              { fromName: { contains: search, mode: "insensitive" } },
              { fromEmail: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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
  });
  res.json({ tickets });
});
