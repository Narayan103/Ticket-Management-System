import { z } from "zod";

export const ticketCategorySchema = z.enum(["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]);

export const inboundEmailSchema = z.object({
  fromEmail: z.string().trim().email("Enter a valid email address"),
  fromName: z.string().trim().min(1, "Name is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string(),
  bodyHtml: z.string().optional(),
  category: ticketCategorySchema.optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
