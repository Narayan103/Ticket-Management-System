import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import TicketsFilters from './TicketsFilters'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

function renderFilters(valueOverrides: { search?: string } = {}) {
  const props = {
    search: '',
    onSearchChange: vi.fn(),
    status: 'ALL' as const,
    onStatusChange: vi.fn(),
    category: 'ALL' as const,
    onCategoryChange: vi.fn(),
    priority: 'ALL' as const,
    onPriorityChange: vi.fn(),
    assignee: 'ALL' as const,
    onAssigneeChange: vi.fn(),
    ...valueOverrides,
  }
  renderWithQuery(<TicketsFilters {...props} />)
  return props
}

describe('TicketsFilters', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGet.mockResolvedValue({ data: { agents: [{ id: 'agent-1', name: 'Agent Smith' }] } })
  })

  it('renders a search input and all filter dropdowns', () => {
    renderFilters()

    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by category' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by priority' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by assignee' })).toBeInTheDocument()
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
    expect(props.onPriorityChange).toHaveBeenCalledWith('ALL')
    expect(props.onAssigneeChange).toHaveBeenCalledWith('ALL')
  })

  it('calls onSearchChange as the user types', async () => {
    const user = userEvent.setup()
    const props = renderFilters()

    await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'login')

    expect(props.onSearchChange).toHaveBeenCalled()
    expect(props.onSearchChange.mock.calls.at(-1)?.[0]).toBe('n')
  })
})
