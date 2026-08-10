export type TicketStatus = "NEW" | "PROCESSING" | "OPEN" | "RESOLVED" | "CLOSED"

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  OPEN: "Open",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

// NEW/PROCESSING are internal states the AI auto-resolution pipeline moves a ticket
// through — an agent can only manually set a ticket to one of these three.
export const AGENT_SETTABLE_TICKET_STATUSES = ["OPEN", "RESOLVED", "CLOSED"] as const satisfies TicketStatus[]
