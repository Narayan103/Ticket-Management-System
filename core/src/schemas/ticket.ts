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

export const ticketSortFieldSchema = z.enum(["subject", "fromName", "category", "status", "createdAt"]);
export const ticketSortOrderSchema = z.enum(["asc", "desc"]);
export const ticketStatusSchema = z.enum(["OPEN", "RESOLVED", "CLOSED"]);
export const ticketCategoryFilterSchema = z.union([ticketCategorySchema, z.literal("UNCLASSIFIED")]);

export const listTicketsQuerySchema = z.object({
  sortBy: ticketSortFieldSchema.optional(),
  sortOrder: ticketSortOrderSchema.optional(),
  status: ticketStatusSchema.optional(),
  category: ticketCategoryFilterSchema.optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
