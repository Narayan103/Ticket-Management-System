export type TicketCategory = "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST"

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: "General Question",
  TECHNICAL_QUESTION: "Technical Question",
  REFUND_REQUEST: "Refund Request",
}
