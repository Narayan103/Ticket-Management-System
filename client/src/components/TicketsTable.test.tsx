import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TicketsTable from './TicketsTable'

describe('TicketsTable', () => {
  it('shows a loading skeleton when pending', () => {
    const { container } = render(<TicketsTable tickets={[]} isPending={true} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no tickets', () => {
    render(<TicketsTable tickets={[]} isPending={false} />)

    expect(screen.getByText('No tickets found.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders each ticket row with its sender name/email and status styling', () => {
    render(
      <TicketsTable
        isPending={false}
        tickets={[
          {
            id: 2,
            subject: 'Newest ticket',
            status: 'OPEN',
            category: 'TECHNICAL_QUESTION',
            fromEmail: 'newer@example.com',
            fromName: 'Newer Sender',
            createdAt: '2024-02-20T00:00:00.000Z',
          },
          {
            id: 1,
            subject: 'Older ticket',
            status: 'CLOSED',
            category: null,
            fromEmail: 'older@example.com',
            fromName: 'Older Sender',
            createdAt: '2024-01-15T00:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Newer Sender')).toBeInTheDocument()
    expect(screen.getByText('newer@example.com')).toBeInTheDocument()
    expect(screen.getByText('Older Sender')).toBeInTheDocument()
    expect(screen.getByText('older@example.com')).toBeInTheDocument()
    expect(screen.getByText('OPEN')).toHaveClass('text-purple-600')
    expect(screen.getByText('CLOSED')).not.toHaveClass('text-purple-600')
  })

  it('renders tickets in the order given (sorting is the server\'s responsibility, not the table\'s)', () => {
    render(
      <TicketsTable
        isPending={false}
        tickets={[
          { id: 2, subject: 'Newest ticket', status: 'OPEN', category: null, fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-02-20T00:00:00.000Z' },
          { id: 1, subject: 'Older ticket', status: 'OPEN', category: null, fromEmail: 'b@example.com', fromName: 'B', createdAt: '2024-01-15T00:00:00.000Z' },
        ]}
      />,
    )

    const rows = screen.getAllByRole('row').slice(1) // drop header row
    expect(rows[0]).toHaveTextContent('Newest ticket')
    expect(rows[1]).toHaveTextContent('Older ticket')
  })

  it('renders category as its human label, and "Unclassified" when category is null', () => {
    render(
      <TicketsTable
        isPending={false}
        tickets={[
          { id: 1, subject: 'Classified', status: 'OPEN', category: 'TECHNICAL_QUESTION', fromEmail: 'a@example.com', fromName: 'A', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: 2, subject: 'Unclassified ticket', status: 'OPEN', category: null, fromEmail: 'b@example.com', fromName: 'B', createdAt: '2024-01-16T00:00:00.000Z' },
        ]}
      />,
    )

    expect(screen.getByText('Technical Question')).toBeInTheDocument()
    expect(screen.getByText('Unclassified')).toBeInTheDocument()
  })
})
