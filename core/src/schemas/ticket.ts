import { z } from "zod";

export const ticketCategorySchema = z.enum(["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]);

export const inboundEmailSchema = z.object({
  fromEmail: z.string().trim().max(254, "Email must be 254 characters or fewer").email("Enter a valid email address"),
  fromName: z.string().trim().min(1, "Name is required").max(255, "Name must be 255 characters or fewer"),
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject must be 255 characters or fewer"),
  body: z.string().max(1000, "Body must be 1,000 characters or fewer"),
  bodyHtml: z.string().max(2000, "Body HTML must be 2,000 characters or fewer").optional(),
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
  search: z.string().trim().min(1).max(200, "Search must be 200 characters or fewer").optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const updateTicketSchema = z
  .object({
    status: ticketStatusSchema.optional(),
    category: ticketCategorySchema.nullable().optional(),
    assignedToId: z.string().max(255, "Assignee id must be 255 characters or fewer").nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.category !== undefined || data.assignedToId !== undefined, {
    message: "At least one of status, category, or assignedToId must be provided",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
