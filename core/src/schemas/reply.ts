import { z } from "zod";

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
