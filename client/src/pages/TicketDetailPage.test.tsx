import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}))

vi.mock('@/lib/auth-client', () => ({
  useSession: vi.fn(),
}))

const mockedGet = vi.mocked(apiClient.get)
const mockedUseSession = vi.mocked(useSession)

function mockSession(role: 'ADMIN' | 'AGENT') {
  // @ts-expect-error only the fields the component reads are provided
  mockedUseSession.mockReturnValue({ data: { user: { role } } })
}

function renderTicketDetailPage(id = '1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${id}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockSession('AGENT')
  })

  it('shows a loading skeleton while the request is in flight', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    const { container } = renderTicketDetailPage()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders the ticket once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        ticket: {
          id: 1,
          subject: 'Cannot log in',
          status: 'OPEN',
          category: 'TECHNICAL_QUESTION',
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'I cannot log in to my account.',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z',
          assignedTo: { id: 'agent-1', name: 'Agent Smith' },
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByText('Cannot log in')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Technical Question')).toBeInTheDocument()
    expect(screen.getByText('A Customer (a@example.com)')).toBeInTheDocument()
    expect(screen.getByText('Agent Smith')).toBeInTheDocument()
    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/api/tickets/1')
  })

  it('shows the assignee as plain text (no editable control) for a non-admin session', async () => {
    mockSession('AGENT')
    mockedGet.mockResolvedValue({
      data: {
        ticket: {
          id: 1,
          subject: 'Cannot log in',
          status: 'OPEN',
          category: null,
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'I cannot log in to my account.',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z',
          assignedTo: { id: 'agent-1', name: 'Agent Smith' },
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByText('Agent Smith')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Assign to agent' })).not.toBeInTheDocument()
    expect(mockedGet).not.toHaveBeenCalledWith('/api/users/agents')
  })

  it('shows an editable assignment control for an admin session, populated from /api/users/agents', async () => {
    mockSession('ADMIN')
    mockedGet.mockImplementation((url: string) => {
      if (url === '/api/users/agents') {
        return Promise.resolve({ data: { agents: [{ id: 'agent-1', name: 'Agent Smith' }] } })
      }
      return Promise.resolve({
        data: {
          ticket: {
            id: 1,
            subject: 'Cannot log in',
            status: 'OPEN',
            category: null,
            fromEmail: 'a@example.com',
            fromName: 'A Customer',
            body: 'I cannot log in to my account.',
            createdAt: '2024-01-15T00:00:00.000Z',
            updatedAt: '2024-01-16T00:00:00.000Z',
            assignedTo: null,
          },
        },
      })
    })

    renderTicketDetailPage('1')

    expect(await screen.findByRole('combobox', { name: 'Assign to agent' })).toBeInTheDocument()
    expect(mockedGet).toHaveBeenCalledWith('/api/users/agents')
  })

  it('shows "Unclassified" and "Unassigned" when the ticket has no category/assignee', async () => {
    mockedGet.mockResolvedValue({
      data: {
        ticket: {
          id: 1,
          subject: 'Cannot log in',
          status: 'OPEN',
          category: null,
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'I cannot log in to my account.',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
          assignedTo: null,
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByText('Unclassified')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('shows the server error message when the ticket is not found', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Ticket not found' } },
    })

    renderTicketDetailPage('999')

    expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
  })
})
