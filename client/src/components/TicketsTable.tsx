import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { TicketStatus } from '@/types/ticket-status'
import type { TicketCategory } from '@/types/ticket-category'

export type Ticket = {
  id: number
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  fromEmail: string
  fromName: string
  createdAt: string
}

type TicketsTableProps = { tickets: Ticket[]; isPending: boolean }

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'font-medium text-purple-600 dark:text-purple-400',
  RESOLVED: 'font-medium text-green-600 dark:text-green-400',
  CLOSED: 'text-neutral-500 dark:text-neutral-500',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: 'General Question',
  TECHNICAL_QUESTION: 'Technical Question',
  REFUND_REQUEST: 'Refund Request',
}

function TicketsTable({ tickets, isPending }: TicketsTableProps) {
  if (isPending) {
    return (
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (tickets.length === 0) {
    return <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No tickets found.</p>
  }

  return (
    <Table className="mt-6">
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>{ticket.subject}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{ticket.fromName}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{ticket.fromEmail}</span>
              </div>
            </TableCell>
            <TableCell>
              {ticket.category ? (
                CATEGORY_LABELS[ticket.category]
              ) : (
                <span className="text-neutral-500 dark:text-neutral-400">Unclassified</span>
              )}
            </TableCell>
            <TableCell>
              <span className={STATUS_STYLES[ticket.status]}>{ticket.status}</span>
            </TableCell>
            <TableCell>{new Date(ticket.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default TicketsTable
