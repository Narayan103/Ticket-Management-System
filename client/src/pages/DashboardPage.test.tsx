import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import DashboardPage from './DashboardPage'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('shows skeletons while the request is in flight', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderWithQuery(<DashboardPage />)

    expect(screen.queryByText('Total Tickets')).not.toBeInTheDocument()
  })

  it('renders the fetched stats once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalTickets: 42,
        openTickets: 10,
        aiResolvedTickets: 21,
        averageResolutionSeconds: 5400,
        ticketsPerDay: [
          { date: '2026-08-09', count: 3 },
          { date: '2026-08-10', count: 5 },
        ],
      },
    })

    renderWithQuery(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
    expect(screen.getByText('Total Tickets')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('shows a placeholder when there is no resolution data yet', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalTickets: 0,
        openTickets: 0,
        aiResolvedTickets: 0,
        averageResolutionSeconds: null,
        ticketsPerDay: [],
      },
    })

    renderWithQuery(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Avg. Resolution Time')).toBeInTheDocument()
    })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the tickets-per-day chart once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        totalTickets: 42,
        openTickets: 10,
        aiResolvedTickets: 21,
        averageResolutionSeconds: 5400,
        ticketsPerDay: [
          { date: '2026-08-09', count: 3 },
          { date: '2026-08-10', count: 5 },
        ],
      },
    })

    const { container } = renderWithQuery(<DashboardPage />)

    expect(screen.getByText('Tickets per Day (Last 30 Days)')).toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    })
  })

  it('shows the server error message instead of the stats when the request fails', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Not authorized' } },
    })

    renderWithQuery(<DashboardPage />)

    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
    expect(screen.queryByText('Total Tickets')).not.toBeInTheDocument()
  })
})
