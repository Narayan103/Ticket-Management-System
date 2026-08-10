import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Role } from '@/types/role'
import { TICKET_STATUS_LABELS, AGENT_SETTABLE_TICKET_STATUSES, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

type Agent = { id: string; name: string }

type UpdateTicketProps = {
  ticketId: string
  status: TicketStatus
  category: TicketCategory | null
  assignedTo: Agent | null
}

type AgentSettableTicketStatus = (typeof AGENT_SETTABLE_TICKET_STATUSES)[number]

type TicketUpdate =
  | { status: AgentSettableTicketStatus }
  | { category: TicketCategory | null }
  | { assignedToId: string | null }

const UNASSIGNED = 'UNASSIGNED'
const UNCLASSIFIED = 'UNCLASSIFIED'

const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  PROCESSING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  OPEN: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  CLOSED: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function UpdateTicket({ ticketId, status, category, assignedTo }: UpdateTicketProps) {
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
        <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Status</p>
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
        <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Category</p>
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
        <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-500">Assigned to</p>
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
          <p className="text-sm text-neutral-900 dark:text-neutral-50">{assignedTo?.name ?? 'Unassigned'}</p>
        )}
      </div>

      {updateErrorMessage && <p className="text-xs text-red-600 dark:text-red-400">{updateErrorMessage}</p>}
    </div>
  )
}

export default UpdateTicket
