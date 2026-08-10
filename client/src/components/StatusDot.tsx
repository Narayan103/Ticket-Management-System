import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/types/ticket-status'

const STATUS_COLORS: Record<TicketStatus, string> = {
  NEW: 'text-signal-new',
  PROCESSING: 'text-signal-processing',
  OPEN: 'text-signal-open',
  RESOLVED: 'text-signal-resolved',
  CLOSED: 'text-muted-foreground',
}

type StatusDotProps = {
  status: TicketStatus
  isFresh?: boolean
}

function StatusDot({ status, isFresh = false }: StatusDotProps) {
  const pulsing = isFresh && status !== 'CLOSED'

  return (
    <span
      data-testid="status-dot"
      data-status={status}
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full bg-current', STATUS_COLORS[status], pulsing && 'animate-signal-pulse')}
    />
  )
}

export default StatusDot
