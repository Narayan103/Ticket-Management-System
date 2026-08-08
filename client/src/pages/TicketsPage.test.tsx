import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
})
