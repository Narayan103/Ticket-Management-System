import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import TicketsTable, { type Ticket } from '@/components/TicketsTable'

function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const sort = sorting[0]

  const { data: tickets = [], isPending, error } = useQuery({
    queryKey: ['tickets', sort],
    queryFn: () =>
      apiClient
        .get<{ tickets: Ticket[] }>('/api/tickets', {
          params: { sortBy: sort?.id, sortOrder: sort?.desc ? 'desc' : 'asc' },
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

      {errorMessage && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      {!errorMessage && (
        <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
      )}
    </main>
  )
}

export default TicketsPage
