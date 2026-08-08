import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketsPagination from './TicketsPagination'

describe('TicketsPagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<TicketsPagination page={1} totalPages={1} onPageChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a page button for every page when there are few pages', () => {
    render(<TicketsPagination page={1} totalPages={5} onPageChange={vi.fn()} />)

    for (const page of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: String(page) })).toBeInTheDocument()
    }
  })

  it('marks the current page as active', () => {
    render(<TicketsPagination page={3} totalPages={5} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '2' })).not.toHaveAttribute('aria-current')
  })

  it('collapses distant pages behind an ellipsis when there are many pages', () => {
    render(<TicketsPagination page={1} totalPages={20} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '10' })).not.toBeInTheDocument()
    expect(screen.getAllByText('More pages').length).toBeGreaterThan(0)
  })

  it('calls onPageChange with the clicked page number', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<TicketsPagination page={1} totalPages={5} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: '3' }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with the next/previous page when those buttons are clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<TicketsPagination page={2} totalPages={5} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Go to previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('disables the previous button on the first page and the next button on the last page', () => {
    render(<TicketsPagination page={1} totalPages={5} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Go to previous page' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Go to next page' })).not.toHaveAttribute('aria-disabled', 'true')
  })
})
