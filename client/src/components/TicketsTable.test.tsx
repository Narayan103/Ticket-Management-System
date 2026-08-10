import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import type { SortingState } from '@tanstack/react-table'
import type { ReactElement } from 'react'
import TicketsTable from './TicketsTable'

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }]

function renderTable(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('TicketsTable', () => {
  it('shows a loading skeleton when pending', () => {
    const { container } = renderTable(
      <TicketsTable tickets={[]} isPending={true} sorting={DEFAULT_SORTING} onSortingChange={vi.fn()} />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no tickets', () => {
    renderTable(<TicketsTable tickets={[]} isPending={false} sorting={DEFAULT_SORTING} onSortingChange={vi.fn()} />)

    expect(screen.getByText('No tickets found.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders each ticket row with its sender name/email and status styling', () => {
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={DEFAULT_SORTING}
        onSortingChange={vi.fn()}
        tickets={[
          {
            id: 2,
            subject: 'Newest ticket',
            status: 'OPEN',
            category: 'TECHNICAL_QUESTION',
            fromEmail: 'newer@example.com',
            fromName: 'Newer Sender',
            createdAt: '2024-02-20T00:00:00.000Z',
            updatedAt: '2024-02-20T00:00:00.000Z',
          },
          {
            id: 1,
            subject: 'Older ticket',
            status: 'CLOSED',
            category: null,
            fromEmail: 'older@example.com',
            fromName: 'Older Sender',
            createdAt: '2024-01-15T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Newer Sender')).toBeInTheDocument()
    expect(screen.getByText('newer@example.com')).toBeInTheDocument()
    expect(screen.getByText('Older Sender')).toBeInTheDocument()
    expect(screen.getByText('older@example.com')).toBeInTheDocument()
    expect(screen.getByText('Open').querySelector('[data-testid="status-dot"]')).toHaveAttribute('data-status', 'OPEN')
    expect(screen.getByText('Closed').querySelector('[data-testid="status-dot"]')).toHaveAttribute('data-status', 'CLOSED')
  })

  it('renders tickets in the order given (sorting is the server\'s responsibility, not the table\'s)', () => {
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={DEFAULT_SORTING}
        onSortingChange={vi.fn()}
        tickets={[
          { id: 2, subject: 'Newest ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-02-20T00:00:00.000Z', updatedAt: '2024-02-20T00:00:00.000Z' },
          { id: 1, subject: 'Older ticket', status: 'OPEN', category: null, fromEmail: 'b@example.com', fromName: 'B', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    const rows = screen.getAllByRole('row').slice(1) // drop header row
    expect(rows[0]).toHaveTextContent('Newest ticket')
    expect(rows[1]).toHaveTextContent('Older ticket')
  })

  it('renders category as its human label, and "Unclassified" when category is null', () => {
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={DEFAULT_SORTING}
        onSortingChange={vi.fn()}
        tickets={[
          { id: 1, subject: 'Classified', status: 'OPEN', category: 'TECHNICAL_QUESTION', fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
          { id: 2, subject: 'Unclassified ticket', status: 'OPEN', category: null, fromEmail: 'b@example.com', fromName: 'B', createdAt: '2024-01-16T00:00:00.000Z', updatedAt: '2024-01-16T00:00:00.000Z' },
        ]}
      />,
    )

    expect(screen.getByText('Technical Question')).toBeInTheDocument()
    expect(screen.getByText('Unclassified')).toBeInTheDocument()
  })

  it('clicking a different column header calls onSortingChange with that column, ascending', async () => {
    const user = userEvent.setup()
    const onSortingChange = vi.fn()
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={DEFAULT_SORTING}
        onSortingChange={onSortingChange}
        tickets={[
          { id: 1, subject: 'A ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /subject/i }))

    expect(onSortingChange).toHaveBeenCalledTimes(1)
    const updater = onSortingChange.mock.calls[0][0]
    const result = typeof updater === 'function' ? updater(DEFAULT_SORTING) : updater
    expect(result).toEqual([{ id: 'subject', desc: false }])
  })

  it('clicking the currently-sorted column toggles its direction instead of clearing it', async () => {
    const user = userEvent.setup()
    const onSortingChange = vi.fn()
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={onSortingChange}
        tickets={[
          { id: 1, subject: 'A ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /created/i }))

    const updater = onSortingChange.mock.calls[0][0]
    const result = typeof updater === 'function' ? updater([{ id: 'createdAt', desc: true }]) : updater
    expect(result).toEqual([{ id: 'createdAt', desc: false }])
  })

  it('renders the subject as a link to the ticket detail page', () => {
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={DEFAULT_SORTING}
        onSortingChange={vi.fn()}
        tickets={[
          { id: 42, subject: 'A ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'A ticket' })).toHaveAttribute('href', '/tickets/42')
  })

  it('shows a direction icon only on the active column, and a neutral hint icon on the rest', () => {
    renderTable(
      <TicketsTable
        isPending={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        tickets={[
          { id: 1, subject: 'A ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    const createdIcon = screen.getByRole('button', { name: /created/i }).querySelector('svg')
    const subjectIcon = screen.getByRole('button', { name: /subject/i }).querySelector('svg')

    // Active column (createdAt, desc) shows a direction icon, not the neutral hint.
    expect(createdIcon).not.toHaveClass('text-muted-foreground')
    // Inactive column (subject) shows the neutral "sortable but not sorted" hint icon.
    expect(subjectIcon).toHaveClass('text-muted-foreground')
  })
})
