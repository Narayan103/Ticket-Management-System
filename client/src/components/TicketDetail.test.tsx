import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { formatDateTime } from '@/lib/format-date'
import TicketDetail from './TicketDetail'

const defaultProps = {
  subject: 'Cannot log in',
  fromName: 'A Customer',
  fromEmail: 'a@example.com',
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-16T00:00:00.000Z',
  body: 'I cannot log in to my account.',
}

describe('TicketDetail', () => {
  it('renders the subject as a heading', () => {
    render(<TicketDetail {...defaultProps} />)

    expect(screen.getByText('Cannot log in')).toBeInTheDocument()
  })

  it('renders the sender name and email', () => {
    render(<TicketDetail {...defaultProps} />)

    expect(screen.getByText('A Customer (a@example.com)')).toBeInTheDocument()
  })

  it('renders the created and updated dates formatted with formatDateTime', () => {
    render(<TicketDetail {...defaultProps} />)

    expect(screen.getByText(formatDateTime(defaultProps.createdAt))).toBeInTheDocument()
    expect(screen.getByText(formatDateTime(defaultProps.updatedAt))).toBeInTheDocument()
  })

  it('renders the message body attributed to the sender', () => {
    render(<TicketDetail {...defaultProps} />)

    expect(screen.getByText('From A Customer')).toBeInTheDocument()
    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks in the body', () => {
    const { container } = render(<TicketDetail {...defaultProps} body={'Line one\nLine two'} />)

    const bodyEl = container.querySelector('.whitespace-pre-wrap')
    expect(bodyEl?.textContent).toBe('Line one\nLine two')
  })

  it('renders bodyHtml instead of the plain-text body when present', () => {
    render(<TicketDetail {...defaultProps} bodyHtml="<p>Hello <strong>there</strong></p>" />)

    expect(screen.getByText('there').tagName).toBe('STRONG')
    expect(screen.queryByText('I cannot log in to my account.')).not.toBeInTheDocument()
  })

  it('strips script tags and inline event handlers from bodyHtml before rendering', () => {
    const { container } = render(
      <TicketDetail
        {...defaultProps}
        bodyHtml={'<p onclick="alert(1)">Safe text</p><script>alert(2)</script>'}
      />,
    )

    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container.querySelector('[onclick]')).not.toBeInTheDocument()
    expect(screen.getByText('Safe text')).toBeInTheDocument()
  })

  it('falls back to the plain-text body when bodyHtml is null', () => {
    render(<TicketDetail {...defaultProps} bodyHtml={null} />)

    expect(screen.getByText('I cannot log in to my account.')).toBeInTheDocument()
  })
})
