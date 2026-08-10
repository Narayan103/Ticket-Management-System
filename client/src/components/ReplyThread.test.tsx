import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatDateTime } from '@/lib/format-date'
import ReplyThread from './ReplyThread'

describe('ReplyThread', () => {
  it('renders nothing when there are no replies', () => {
    const { container } = render(<ReplyThread replies={[]} />)

    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(0)
  })

  it('renders replies in the order given', () => {
    render(
      <ReplyThread
        replies={[
          { id: 1, body: 'First reply', senderType: 'CUSTOMER', createdAt: '2024-01-15T10:00:00.000Z', author: null },
          {
            id: 2,
            body: 'Second reply',
            senderType: 'AGENT',
            createdAt: '2024-01-15T11:00:00.000Z',
            author: { id: 'agent-1', name: 'Agent Smith' },
          },
        ]}
      />,
    )

    const replies = screen.getAllByText(/reply$/)
    expect(replies.map((el) => el.textContent)).toEqual(['First reply', 'Second reply'])
  })

  it('shows "Unknown" as the author when a reply has no author', () => {
    render(
      <ReplyThread
        replies={[{ id: 1, body: 'First reply', senderType: 'CUSTOMER', createdAt: '2024-01-15T10:00:00.000Z', author: null }]}
      />,
    )

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it("shows the author's name when a reply has an author", () => {
    render(
      <ReplyThread
        replies={[
          {
            id: 1,
            body: 'Second reply',
            senderType: 'AGENT',
            createdAt: '2024-01-15T11:00:00.000Z',
            author: { id: 'agent-1', name: 'Agent Smith' },
          },
        ]}
      />,
    )

    expect(screen.getByText('Agent Smith')).toBeInTheDocument()
  })

  it('renders the sender type label and formatted date', () => {
    render(
      <ReplyThread
        replies={[
          { id: 1, body: 'First reply', senderType: 'CUSTOMER', createdAt: '2024-01-15T10:00:00.000Z', author: null },
          {
            id: 2,
            body: 'Second reply',
            senderType: 'AGENT',
            createdAt: '2024-01-15T11:00:00.000Z',
            author: { id: 'agent-1', name: 'Agent Smith' },
          },
        ]}
      />,
    )

    expect(screen.getByText('Customer ·')).toBeInTheDocument()
    expect(screen.getByText('Agent ·')).toBeInTheDocument()
    expect(screen.getByText(formatDateTime('2024-01-15T10:00:00.000Z'))).toBeInTheDocument()
    expect(screen.getByText(formatDateTime('2024-01-15T11:00:00.000Z'))).toBeInTheDocument()
  })
})
