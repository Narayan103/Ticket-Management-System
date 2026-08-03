import { Router } from "express";
import { createUserSchema } from "core";
import { auth } from "../auth";
import { requireAuth, requireAdmin } from "../require-auth";
import { db } from "../db";
import { Role } from "../types/role";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.authUser.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

usersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const hashedPassword = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser({
    email,
    name,
    role: Role.AGENT,
    emailVerified: true,
  });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hashedPassword,
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});
