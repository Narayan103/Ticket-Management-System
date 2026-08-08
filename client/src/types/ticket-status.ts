export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED"

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}
