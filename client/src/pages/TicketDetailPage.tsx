import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import TicketDetail from '@/components/TicketDetail'
import UpdateTicket from '@/components/UpdateTicket'
import ReplyForm from '@/components/ReplyForm'
import ReplyThread from '@/components/ReplyThread'
import TicketSummary from '@/components/TicketSummary'
import ErrorMessage from '@/components/ErrorMessage'
import type { TicketStatus } from '@/types/ticket-status'
import type { TicketCategory } from '@/types/ticket-category'
import type { ReplySenderType } from '@/types/reply-sender-type'

type Agent = { id: string; name: string }

type Reply = {
  id: number
  body: string
  senderType: ReplySenderType
  createdAt: string
  author: Agent | null
}

type Ticket = {
  id: number
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  fromEmail: string
  fromName: string
  body: string
  bodyHtml: string | null
  createdAt: string
  updatedAt: string
  assignedTo: Agent | null
  replies: Reply[]
}

function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiClient.get<{ ticket: Ticket }>(`/api/tickets/${id}`).then((res) => res.data.ticket),
  })

  const errorMessage = getErrorMessage(error, 'Failed to load ticket')

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link to="/tickets" />}>
        ← Back to tickets
      </Button>

      <ErrorMessage message={errorMessage} />

      {!errorMessage && isPending && (
        <Card className="mt-4">
          <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-4 h-16 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {!errorMessage && ticket && (
        <Card className="mt-4">
          <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
            <div>
              <TicketDetail
                subject={ticket.subject}
                fromName={ticket.fromName}
                fromEmail={ticket.fromEmail}
                createdAt={ticket.createdAt}
                updatedAt={ticket.updatedAt}
                body={ticket.body}
                bodyHtml={ticket.bodyHtml}
              />

              <Separator className="my-4" />

              <div>
                <TicketSummary ticketId={id!} />

                <p className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-50">Replies</p>
                <div className="mt-2">
                  <ReplyThread replies={ticket.replies} />
                </div>

                <div className="mt-4">
                  <ReplyForm ticketId={id!} />
                </div>
              </div>
            </div>

            <UpdateTicket
              ticketId={id!}
              status={ticket.status}
              category={ticket.category}
              assignedTo={ticket.assignedTo}
            />
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default TicketDetailPage
