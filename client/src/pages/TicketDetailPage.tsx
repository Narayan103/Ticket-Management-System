import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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

type TicketUpdate = { status: TicketStatus } | { category: TicketCategory | null } | { assignedToId: string | null }

const UNASSIGNED = 'UNASSIGNED'
const UNCLASSIFIED = 'UNCLASSIFIED'

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

  const updateMutation = useMutation({
    mutationFn: (data: TicketUpdate) => apiClient.patch(`/api/tickets/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.error ?? error.message)
      : 'Failed to load ticket'
    : null

  const updateErrorMessage = updateMutation.error
    ? axios.isAxiosError(updateMutation.error)
      ? (updateMutation.error.response?.data?.error ?? updateMutation.error.message)
      : 'Failed to update ticket'
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
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
            <div className="space-y-3">
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
          <CardHeader>
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
            <div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-500">From: </span>
                  {ticket.fromName} ({ticket.fromEmail})
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-500">Created: </span>
                  {formatDateTime(ticket.createdAt)}
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-500">Updated: </span>
                  {formatDateTime(ticket.updatedAt)}
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Message</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">From {ticket.fromName}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">{ticket.body}</p>
              </div>
            </div>

            <div className="space-y-4 lg:border-l lg:border-border lg:pl-6">
              <div>
                <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Status</p>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateMutation.mutate({ status: value as TicketStatus })}
                >
                  <SelectTrigger
                    className={`w-full ${STATUS_BADGE_STYLES[ticket.status]}`}
                    aria-label="Ticket status"
                    disabled={updateMutation.isPending}
                  >
                    <SelectValue>{() => TICKET_STATUS_LABELS[ticket.status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Category</p>
                <Select
                  value={ticket.category ?? UNCLASSIFIED}
                  onValueChange={(value) =>
                    updateMutation.mutate({ category: value === UNCLASSIFIED ? null : (value as TicketCategory) })
                  }
                >
                  <SelectTrigger className="w-full" aria-label="Ticket category" disabled={updateMutation.isPending}>
                    <SelectValue>
                      {() => (ticket.category ? TICKET_CATEGORY_LABELS[ticket.category] : 'Unclassified')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNCLASSIFIED}>Unclassified</SelectItem>
                    {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Assigned to</p>
                {isAdmin ? (
                  <Select
                    value={ticket.assignedTo?.id ?? UNASSIGNED}
                    onValueChange={(value) =>
                      updateMutation.mutate({ assignedToId: value === UNASSIGNED ? null : value })
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Assign to agent" disabled={updateMutation.isPending}>
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
                  <p className="text-sm text-neutral-900 dark:text-neutral-50">
                    {ticket.assignedTo?.name ?? 'Unassigned'}
                  </p>
                )}
              </div>

              {updateErrorMessage && <p className="text-xs text-red-600 dark:text-red-400">{updateErrorMessage}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default TicketDetailPage
