import type { Response } from "express";
import type { z } from "zod";

export function validateBody<T>(schema: z.ZodType<T>, data: unknown, res: Response): T | undefined {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return undefined;
  }
  return parsed.data;
}
