import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersTable from './UsersTable'
import { Role } from '@/types/role'

describe('UsersTable', () => {
  it('shows a loading skeleton when pending', () => {
    const { container } = render(<UsersTable users={[]} isPending={true} onEditUser={vi.fn()} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} isPending={false} onEditUser={vi.fn()} />)

    expect(screen.getByText('No users found.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders each user row, styling ADMIN roles distinctly from AGENT', () => {
    render(
      <UsersTable
        isPending={false}
        onEditUser={vi.fn()}
        users={[
          { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: Role.ADMIN, createdAt: '2024-01-15T00:00:00.000Z' },
          { id: '2', name: 'Grace Hopper', email: 'grace@example.com', role: Role.AGENT, createdAt: '2024-02-20T00:00:00.000Z' },
        ]}
      />,
    )

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()

    expect(screen.getByText('ADMIN')).toHaveClass('text-purple-600')
    expect(screen.getByText('AGENT')).not.toHaveClass('text-purple-600')
  })

  it('renders an edit button per row and calls onEditUser with that row\'s user when clicked', async () => {
    const user = userEvent.setup()
    const onEditUser = vi.fn()
    const ada = { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: Role.ADMIN, createdAt: '2024-01-15T00:00:00.000Z' }
    const grace = { id: '2', name: 'Grace Hopper', email: 'grace@example.com', role: Role.AGENT, createdAt: '2024-02-20T00:00:00.000Z' }

    render(<UsersTable isPending={false} onEditUser={onEditUser} users={[ada, grace]} />)

    expect(screen.getByRole('button', { name: 'Edit Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Grace Hopper' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Grace Hopper' }))

    expect(onEditUser).toHaveBeenCalledWith(grace)
  })
})
