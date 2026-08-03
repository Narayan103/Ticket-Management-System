import { z } from "zod";

const nameSchema = z.string().trim().min(3, "Name must be at least 3 characters");
const emailSchema = z.string().trim().email("Enter a valid email address");

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().refine((value) => value.length === 0 || value.length >= 8, {
    message: "Password must be at least 8 characters",
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
