import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Role } from '@/types/role'
import { TICKET_STATUS_LABELS, AGENT_SETTABLE_TICKET_STATUSES, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'
import { TICKET_PRIORITY_LABELS, TICKET_PRIORITY_BADGE_STYLES, type TicketPriority } from '@/types/ticket-priority'

type Agent = { id: string; name: string }

type UpdateTicketProps = {
  ticketId: string
  status: TicketStatus
  category: TicketCategory | null
  priority: TicketPriority
  assignedTo: Agent | null
}

type AgentSettableTicketStatus = (typeof AGENT_SETTABLE_TICKET_STATUSES)[number]

type TicketUpdate =
  | { status: AgentSettableTicketStatus }
  | { category: TicketCategory | null }
  | { priority: TicketPriority }
  | { assignedToId: string | null }

const UNASSIGNED = 'UNASSIGNED'
const UNCLASSIFIED = 'UNCLASSIFIED'

const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  NEW: 'bg-signal-new/10 text-signal-new',
  PROCESSING: 'bg-signal-processing/10 text-signal-processing',
  OPEN: 'bg-signal-open/10 text-signal-open',
  RESOLVED: 'bg-signal-resolved/10 text-signal-resolved',
  CLOSED: 'bg-muted text-muted-foreground',
}

function UpdateTicket({ ticketId, status, category, priority, assignedTo }: UpdateTicketProps) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = session?.user.role === Role.ADMIN

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.get<{ agents: Agent[] }>('/api/users/agents').then((res) => res.data.agents),
    enabled: isAdmin,
  })

  const updateMutation = useMutation({
    mutationFn: (data: TicketUpdate) => apiClient.patch(`/api/tickets/${ticketId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  })

  const updateErrorMessage = getErrorMessage(updateMutation.error, 'Failed to update ticket')

  return (
    <div className="space-y-4 lg:border-l lg:border-border lg:pl-6">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Status</p>
        <Select
          value={status}
          onValueChange={(value) => updateMutation.mutate({ status: value as AgentSettableTicketStatus })}
        >
          <SelectTrigger
            className={`w-full ${STATUS_BADGE_STYLES[status]}`}
            aria-label="Ticket status"
            disabled={updateMutation.isPending}
          >
            <SelectValue>{() => TICKET_STATUS_LABELS[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AGENT_SETTABLE_TICKET_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {TICKET_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Category</p>
        <Select
          value={category ?? UNCLASSIFIED}
          onValueChange={(value) =>
            updateMutation.mutate({ category: value === UNCLASSIFIED ? null : (value as TicketCategory) })
          }
        >
          <SelectTrigger className="w-full" aria-label="Ticket category" disabled={updateMutation.isPending}>
            <SelectValue>{() => (category ? TICKET_CATEGORY_LABELS[category] : 'Unclassified')}</SelectValue>
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
        <p className="mb-1 text-xs text-muted-foreground">Priority</p>
        <Select
          value={priority}
          onValueChange={(value) => updateMutation.mutate({ priority: value as TicketPriority })}
        >
          <SelectTrigger
            className={`w-full ${TICKET_PRIORITY_BADGE_STYLES[priority]}`}
            aria-label="Ticket priority"
            disabled={updateMutation.isPending}
          >
            <SelectValue>{() => TICKET_PRIORITY_LABELS[priority]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Assigned to</p>
        {isAdmin ? (
          <Select
            value={assignedTo?.id ?? UNASSIGNED}
            onValueChange={(value) => updateMutation.mutate({ assignedToId: value === UNASSIGNED ? null : value })}
          >
            <SelectTrigger className="w-full" aria-label="Assign to agent" disabled={updateMutation.isPending}>
              <SelectValue>{() => assignedTo?.name ?? 'Unassigned'}</SelectValue>
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
          <p className="text-sm text-foreground">{assignedTo?.name ?? 'Unassigned'}</p>
        )}
      </div>

      {updateErrorMessage && <p className="text-xs text-destructive">{updateErrorMessage}</p>}
    </div>
  )
}

export default UpdateTicket
