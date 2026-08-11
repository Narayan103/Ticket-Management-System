import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import TicketsPage from './TicketsPage'
import type { Ticket } from '@/components/TicketsTable'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

vi.mock('@/components/TicketsTable', () => ({
  default: ({ tickets, isPending }: { tickets: Ticket[]; isPending: boolean }) => (
    <div data-testid="tickets-table" data-pending={isPending} data-count={tickets.length} />
  ),
}))

const mockedGet = vi.mocked(apiClient.get)

function renderTicketsPage() {
  return renderWithQuery(<TicketsPage />)
}

describe('TicketsPage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('passes the pending state to TicketsTable while the request is in flight', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderTicketsPage()

    expect(screen.getByTestId('tickets-table')).toHaveAttribute('data-pending', 'true')
    expect(screen.getByTestId('tickets-table')).toHaveAttribute('data-count', '0')
  })

  it('passes the fetched tickets to TicketsTable once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        tickets: [
          {
            id: 1,
            subject: 'Cannot log in',
            status: 'OPEN',
            category: 'TECHNICAL_QUESTION',
            fromEmail: 'a@example.com',
            fromName: 'A',
            createdAt: '2024-01-15T00:00:00.000Z',
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 10,
      },
    })

    renderTicketsPage()

    await waitFor(() => {
      expect(screen.getByTestId('tickets-table')).toHaveAttribute('data-pending', 'false')
    })
    expect(screen.getByTestId('tickets-table')).toHaveAttribute('data-count', '1')
  })

  it('shows the server error message instead of the table when the request fails', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Not authorized' } },
    })

    renderTicketsPage()

    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
    expect(screen.queryByTestId('tickets-table')).not.toBeInTheDocument()
  })

  it('refetches with search/status/category params once filters change', async () => {
    mockedGet.mockResolvedValue({ data: { tickets: [], totalCount: 0, page: 1, pageSize: 10 } })
    const user = userEvent.setup()

    renderTicketsPage()

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/api/tickets', {
        params: {
          sortBy: 'createdAt',
          sortOrder: 'desc',
          search: undefined,
          status: undefined,
          category: undefined,
          priority: undefined,
          assignedToId: undefined,
          page: 1,
        },
      })
    })

    await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'refund')

    await waitFor(
      () => {
        expect(mockedGet).toHaveBeenCalledWith('/api/tickets', {
          params: {
            sortBy: 'createdAt',
            sortOrder: 'desc',
            search: 'refund',
            status: undefined,
            category: undefined,
            priority: undefined,
            assignedToId: undefined,
            page: 1,
          },
        })
      },
      { timeout: 1000 },
    )
  })

  it('resets to page 1 and refetches when the page changes', async () => {
    mockedGet.mockResolvedValue({
      data: {
        tickets: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          subject: `Ticket ${i + 1}`,
          status: 'OPEN',
          category: null,
          fromEmail: 'a@example.com',
          fromName: 'A',
          createdAt: '2024-01-15T00:00:00.000Z',
        })),
        totalCount: 25,
        page: 1,
        pageSize: 10,
      },
    })
    const user = userEvent.setup()

    renderTicketsPage()

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/api/tickets', {
        params: expect.objectContaining({ page: 1 }),
      })
    })

    await user.click(await screen.findByRole('button', { name: '2' }))

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/api/tickets', {
        params: expect.objectContaining({ page: 2 }),
      })
    })
  })
})
