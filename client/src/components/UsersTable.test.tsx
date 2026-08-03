import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UsersTable from './UsersTable'
import { Role } from '@/types/role'

describe('UsersTable', () => {
  it('shows a loading skeleton when pending', () => {
    const { container } = render(<UsersTable users={[]} isPending={true} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no users', () => {
    render(<UsersTable users={[]} isPending={false} />)

    expect(screen.getByText('No users found.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders each user row, styling ADMIN roles distinctly from AGENT', () => {
    render(
      <UsersTable
        isPending={false}
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
})
