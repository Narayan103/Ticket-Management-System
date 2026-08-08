import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TicketsFilters from './TicketsFilters'

function renderFilters(valueOverrides: { search?: string } = {}) {
  const props = {
    search: '',
    onSearchChange: vi.fn(),
    status: 'ALL' as const,
    onStatusChange: vi.fn(),
    category: 'ALL' as const,
    onCategoryChange: vi.fn(),
    ...valueOverrides,
  }
  render(<TicketsFilters {...props} />)
  return props
}

describe('TicketsFilters', () => {
  it('renders a search input, status filter, and category filter', () => {
    renderFilters()

    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by category' })).toBeInTheDocument()
  })

  it('does not show a "Clear filters" button when no filter is active', () => {
    renderFilters()

    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('shows "Clear filters" when a filter is active, and resets everything when clicked', async () => {
    const user = userEvent.setup()
    const props = renderFilters({ search: 'refund' })

    const clearButton = screen.getByRole('button', { name: 'Clear filters' })
    await user.click(clearButton)

    expect(props.onSearchChange).toHaveBeenCalledWith('')
    expect(props.onStatusChange).toHaveBeenCalledWith('ALL')
    expect(props.onCategoryChange).toHaveBeenCalledWith('ALL')
  })

  it('calls onSearchChange as the user types', async () => {
    const user = userEvent.setup()
    const props = renderFilters()

    await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'login')

    expect(props.onSearchChange).toHaveBeenCalled()
    expect(props.onSearchChange.mock.calls.at(-1)?.[0]).toBe('n')
  })
})
