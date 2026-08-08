import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import TicketsTable, { type Ticket } from '@/components/TicketsTable'
import TicketsFilters, { type StatusFilter, type CategoryFilter } from '@/components/TicketsFilters'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])
  return debounced
}

function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [category, setCategory] = useState<CategoryFilter>('ALL')
  const debouncedSearch = useDebouncedValue(search, 300)
  const sort = sorting[0]

  const { data: tickets = [], isPending, error } = useQuery({
    queryKey: ['tickets', sort, debouncedSearch, status, category],
    queryFn: () =>
      apiClient
        .get<{ tickets: Ticket[] }>('/api/tickets', {
          params: {
            sortBy: sort?.id,
            sortOrder: sort?.desc ? 'desc' : 'asc',
            search: debouncedSearch || undefined,
            status: status === 'ALL' ? undefined : status,
            category: category === 'ALL' ? undefined : category,
          },
        })
        .then((res) => res.data.tickets),
  })

  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.error ?? error.message)
      : 'Failed to load tickets'
    : null

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Tickets</h1>

      <TicketsFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        category={category}
        onCategoryChange={setCategory}
      />

      {errorMessage && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      {!errorMessage && (
        <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
      )}
    </main>
  )
}

export default TicketsPage
