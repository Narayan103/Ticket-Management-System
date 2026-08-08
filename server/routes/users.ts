import { Router } from "express";
import { createUserSchema, updateUserSchema } from "core";
import { auth } from "../auth";
import { requireAuth, requireAdmin } from "../require-auth";
import { validateBody } from "../lib/validate";
import { db } from "../db";
import { Role } from "../types/role";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.authUser.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

usersRouter.get("/agents", requireAuth, requireAdmin, async (_req, res) => {
  const agents = await db.authUser.findMany({
    where: { deletedAt: null, role: Role.AGENT },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

usersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parsed = validateBody(createUserSchema, req.body, res);
  if (!parsed) return;
  const { name, email, password } = parsed;

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

usersRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const parsed = validateBody(updateUserSchema, req.body, res);
  if (!parsed) return;
  const { name, email, password } = parsed;
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const ctx = await auth.$context;

  const targetUser = await ctx.internalAdapter.findUserById(id);
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (email !== targetUser.email) {
    const existing = await ctx.internalAdapter.findUserByEmail(email);
    if (existing && existing.user.id !== id) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
  }

  const updatedUser = await ctx.internalAdapter.updateUser(id, { name, email });

  if (password) {
    const hashedPassword = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(id, hashedPassword);
  }

  res.json({
    user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, createdAt: updatedUser.createdAt },
  });
});

usersRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const targetUser = await db.authUser.findUnique({ where: { id } });
  if (!targetUser || targetUser.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (targetUser.role === Role.ADMIN) {
    res.status(403).json({ error: "Admin users cannot be deleted" });
    return;
  }

  await db.authUser.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      // Frees up the original email for reuse — the email column has a hard unique
      // constraint, so a soft-deleted row would otherwise permanently block anyone
      // (including a newly created user) from ever using this address again.
      email: `deleted+${targetUser.id}+${targetUser.email}`,
    },
  });

  // Revoke any active sessions immediately — better-auth's own session-check
  // endpoints (used by the client's useSession()) validate purely against the
  // session table and don't know about deletedAt, so a deleted user's already
  // logged-in browser would otherwise stay logged in until the session's natural
  // expiry.
  await db.authSession.deleteMany({ where: { userId: id } });

  res.status(204).send();
});
