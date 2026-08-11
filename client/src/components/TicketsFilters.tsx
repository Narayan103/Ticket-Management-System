import { SearchIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'
import { TICKET_PRIORITY_LABELS, type TicketPriority } from '@/types/ticket-priority'

export type StatusFilter = TicketStatus | 'ALL'
export type CategoryFilter = TicketCategory | 'UNCLASSIFIED' | 'ALL'
export type PriorityFilter = TicketPriority | 'ALL'
export type AssigneeFilter = string | 'UNASSIGNED' | 'ALL'

type Agent = { id: string; name: string }

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'All statuses',
  ...TICKET_STATUS_LABELS,
}

const CATEGORY_FILTER_LABELS: Record<CategoryFilter, string> = {
  ALL: 'All categories',
  UNCLASSIFIED: 'Unclassified',
  ...TICKET_CATEGORY_LABELS,
}

const PRIORITY_FILTER_LABELS: Record<PriorityFilter, string> = {
  ALL: 'All priorities',
  ...TICKET_PRIORITY_LABELS,
}

type TicketsFiltersProps = {
  search: string
  onSearchChange: (search: string) => void
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  category: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  priority: PriorityFilter
  onPriorityChange: (priority: PriorityFilter) => void
  assignee: AssigneeFilter
  onAssigneeChange: (assignee: AssigneeFilter) => void
}

function TicketsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  priority,
  onPriorityChange,
  assignee,
  onAssigneeChange,
}: TicketsFiltersProps) {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.get<{ agents: Agent[] }>('/api/users/agents').then((res) => res.data.agents),
  })

  const hasActiveFilters =
    search !== '' || status !== 'ALL' || category !== 'ALL' || priority !== 'ALL' || assignee !== 'ALL'

  function clearFilters() {
    onSearchChange('')
    onStatusChange('ALL')
    onCategoryChange('ALL')
    onPriorityChange('ALL')
    onAssigneeChange('ALL')
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tickets…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
          aria-label="Search tickets"
        />
      </div>
      <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
        <SelectTrigger aria-label="Filter by status">
          <SelectValue>{(value: StatusFilter) => STATUS_FILTER_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={(value) => onCategoryChange(value as CategoryFilter)}>
        <SelectTrigger aria-label="Filter by category">
          <SelectValue>{(value: CategoryFilter) => CATEGORY_FILTER_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
          <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={(value) => onPriorityChange(value as PriorityFilter)}>
        <SelectTrigger aria-label="Filter by priority">
          <SelectValue>{(value: PriorityFilter) => PRIORITY_FILTER_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All priorities</SelectItem>
          {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={assignee} onValueChange={(value) => onAssigneeChange(value as AssigneeFilter)}>
        <SelectTrigger aria-label="Filter by assignee">
          <SelectValue>
            {(value: AssigneeFilter) => {
              if (value === 'ALL') return 'All assignees'
              if (value === 'UNASSIGNED') return 'Unassigned'
              return agents.find((agent) => agent.id === value)?.name ?? 'All assignees'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All assignees</SelectItem>
          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

export default TicketsFilters
