import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Role } from '@/types/role'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

type Agent = { id: string; name: string }

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
  assignedTo: Agent | null
}

const UNASSIGNED = 'UNASSIGNED'

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
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = session?.user.role === Role.ADMIN

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiClient.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`).then((res) => res.data.ticket),
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.get<{ agents: Agent[] }>('/api/users/agents').then((res) => res.data.agents),
    enabled: isAdmin,
  })

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) => apiClient.patch(`/api/tickets/${id}`, { assignedToId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.error ?? error.message)
      : 'Failed to load ticket'
    : null

  const assignErrorMessage = assignMutation.error
    ? axios.isAxiosError(assignMutation.error)
      ? (assignMutation.error.response?.data?.error ?? assignMutation.error.message)
      : 'Failed to update assignee'
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
              {isAdmin ? (
                <Select
                  value={ticket.assignedTo?.id ?? UNASSIGNED}
                  onValueChange={(value) => assignMutation.mutate(value === UNASSIGNED ? null : value)}
                >
                  <SelectTrigger size="sm" aria-label="Assign to agent" disabled={assignMutation.isPending}>
                    <SelectValue>{() => ticket.assignedTo?.name ?? 'Unassigned'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                ticket.assignedTo?.name ?? 'Unassigned'
              )}
              {assignErrorMessage && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{assignErrorMessage}</p>}
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
