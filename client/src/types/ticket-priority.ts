export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export const TICKET_PRIORITY_BADGE_STYLES: Record<TicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-signal-open/10 text-signal-open",
  HIGH: "bg-signal-processing/10 text-signal-processing",
  URGENT: "bg-destructive/10 text-destructive",
}
