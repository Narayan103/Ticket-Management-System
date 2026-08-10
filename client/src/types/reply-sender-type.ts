export type ReplySenderType = "AGENT" | "CUSTOMER" | "AI"

export const REPLY_SENDER_TYPE_LABELS: Record<ReplySenderType, string> = {
  AGENT: "Agent",
  CUSTOMER: "Customer",
  AI: "Agent",
}
