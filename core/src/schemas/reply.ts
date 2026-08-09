import { z } from "zod";

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty").max(10000, "Reply must be 10,000 characters or fewer"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
