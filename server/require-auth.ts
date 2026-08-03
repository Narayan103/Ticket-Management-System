import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.session = result.session;
  req.user = result.user;
  next();
}
