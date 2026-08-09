import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(255, "Name must be 255 characters or fewer");
const emailSchema = z.string().trim().max(254, "Email must be 254 characters or fewer").email("Enter a valid email address");

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: "Password must be at least 8 characters",
    })
    .refine((value) => value.length <= 128, {
      message: "Password must be 128 characters or fewer",
    }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
