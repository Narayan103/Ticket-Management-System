import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

type TicketDetail = {
  id: number
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  fromEmail: string
  fromName: string
  body: string
  createdAt: string
  updatedAt: string
  assignedTo: { name: string } | null
}

const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  CLOSED: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiClient.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`).then((res) => res.data.ticket),
  })

  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.error ?? error.message)
      : 'Failed to load ticket'
    : null

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link to="/tickets" />}>
        ← Back to tickets
      </Button>

      {errorMessage && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

      {!errorMessage && isPending && (
        <Card className="mt-4">
          <CardHeader>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <Separator />
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      )}

      {!errorMessage && ticket && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="flex gap-1.5">
              <Badge className={STATUS_BADGE_STYLES[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
              <Badge variant="secondary">
                {ticket.category ? TICKET_CATEGORY_LABELS[ticket.category] : 'Unclassified'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">From: </span>
              {ticket.fromName} ({ticket.fromEmail})
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Assigned to: </span>
              {ticket.assignedTo?.name ?? 'Unassigned'}
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Created: </span>
              {formatDateTime(ticket.createdAt)}
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Updated: </span>
              {formatDateTime(ticket.updatedAt)}
            </div>
          </CardContent>

          <Separator />

          <CardContent>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Message</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">From {ticket.fromName}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">{ticket.body}</p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default TicketDetailPage
