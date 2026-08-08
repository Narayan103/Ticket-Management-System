import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import TicketsTable, { type Ticket } from '@/components/TicketsTable'
import TicketsFilters, { type StatusFilter, type CategoryFilter } from '@/components/TicketsFilters'
import TicketsPagination from '@/components/TicketsPagination'

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
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const sort = sorting[0]

  useEffect(() => {
    setPage(1)
  }, [sort, debouncedSearch, status, category])

  const {
    data = { tickets: [] as Ticket[], totalCount: 0, pageSize: 10 },
    isPending,
    error,
  } = useQuery({
    queryKey: ['tickets', sort, debouncedSearch, status, category, page],
    queryFn: () =>
      apiClient
        .get<{ tickets: Ticket[]; totalCount: number; page: number; pageSize: number }>('/api/tickets', {
          params: {
            sortBy: sort?.id,
            sortOrder: sort?.desc ? 'desc' : 'asc',
            search: debouncedSearch || undefined,
            status: status === 'ALL' ? undefined : status,
            category: category === 'ALL' ? undefined : category,
            page,
          },
        })
        .then((res) => res.data),
  })
  const { tickets, totalCount, pageSize } = data
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

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
        <>
          <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
          <TicketsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </main>
  )
}

export default TicketsPage
