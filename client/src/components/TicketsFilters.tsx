import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@/types/ticket-status'
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '@/types/ticket-category'

export type StatusFilter = TicketStatus | 'ALL'
export type CategoryFilter = TicketCategory | 'UNCLASSIFIED' | 'ALL'

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'All statuses',
  ...TICKET_STATUS_LABELS,
}

const CATEGORY_FILTER_LABELS: Record<CategoryFilter, string> = {
  ALL: 'All categories',
  UNCLASSIFIED: 'Unclassified',
  ...TICKET_CATEGORY_LABELS,
}

type TicketsFiltersProps = {
  search: string
  onSearchChange: (search: string) => void
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  category: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
}

function TicketsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
}: TicketsFiltersProps) {
  const hasActiveFilters = search !== '' || status !== 'ALL' || category !== 'ALL'

  function clearFilters() {
    onSearchChange('')
    onStatusChange('ALL')
    onCategoryChange('ALL')
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
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

export default TicketsFilters
