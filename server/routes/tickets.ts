import { Router } from "express";
import { requireAuth } from "../require-auth";
import { db } from "../db";

export const ticketsRouter = Router();

ticketsRouter.get("/", requireAuth, async (_req, res) => {
  const tickets = await db.ticket.findMany({
    orderBy: { createdAt: "desc" },
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
