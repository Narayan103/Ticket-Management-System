import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useSession } from '@/lib/auth-client'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
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
          priority: 'HIGH',
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'I cannot log in to my account.',
          bodyHtml: null,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z',
          assignedTo: { id: 'agent-1', name: 'Agent Smith' },
          replies: [
            {
              id: 1,
              body: 'Thanks for reaching out, looking into this now.',
              senderType: 'AGENT',
              createdAt: '2024-01-15T12:00:00.000Z',
              author: { id: 'agent-2', name: 'Another Agent' },
            },
          ],
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

  it('shows editable status, category, and priority selects for a non-admin session (not admin-gated, unlike assignment)', async () => {
    mockSession('AGENT')
    mockedGet.mockResolvedValue({
      data: {
        ticket: {
          id: 1,
          subject: 'Cannot log in',
          status: 'OPEN',
          category: 'TECHNICAL_QUESTION',
          priority: 'HIGH',
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'I cannot log in to my account.',
          bodyHtml: null,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z',
          assignedTo: null,
          replies: [],
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByRole('combobox', { name: 'Ticket status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ticket category' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ticket priority' })).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
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
          bodyHtml: null,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-16T00:00:00.000Z',
          assignedTo: { id: 'agent-1', name: 'Agent Smith' },
          replies: [],
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
            bodyHtml: null,
            createdAt: '2024-01-15T00:00:00.000Z',
            updatedAt: '2024-01-16T00:00:00.000Z',
            assignedTo: null,
            replies: [],
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
          bodyHtml: null,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
          assignedTo: null,
          replies: [],
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByText('Unclassified')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('passes the fetched replies through to the reply thread', async () => {
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
          bodyHtml: null,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
          assignedTo: null,
          replies: [
            {
              id: 1,
              body: 'First reply',
              senderType: 'CUSTOMER',
              createdAt: '2024-01-15T10:00:00.000Z',
              author: null,
            },
          ],
        },
      },
    })

    renderTicketDetailPage('1')

    expect(await screen.findByText('First reply')).toBeInTheDocument()
  })

  it('renders a sanitized version of bodyHtml when the ticket has one', async () => {
    mockedGet.mockResolvedValue({
      data: {
        ticket: {
          id: 1,
          subject: 'Cannot log in',
          status: 'OPEN',
          category: null,
          fromEmail: 'a@example.com',
          fromName: 'A Customer',
          body: 'plain text fallback',
          bodyHtml: '<p>Hello <strong>there</strong></p><script>alert(1)</script>',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
          assignedTo: null,
          replies: [],
        },
      },
    })

    const { container } = renderTicketDetailPage('1')

    expect(await screen.findByText('there')).toBeInTheDocument()
    expect(screen.getByText('there').tagName).toBe('STRONG')
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(screen.queryByText('plain text fallback')).not.toBeInTheDocument()
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
