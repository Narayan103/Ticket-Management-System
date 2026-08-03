import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { db } from "./db";
import { Role } from "./types/role";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db.authUser.findUnique({ where: { id: result.user.id }, select: { deletedAt: true } });
  if (user?.deletedAt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.session = result.session;
  req.user = result.user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== Role.ADMIN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
