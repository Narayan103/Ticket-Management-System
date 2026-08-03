import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '@/test-utils'
import EditUserModal from './EditUserModal'
import { Role } from '@/types/role'
import type { User } from '@/components/UsersTable'

vi.mock('@/components/EditUserForm', () => ({
  default: ({ user, onOpenChange }: { user: User; open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="edit-user-form" data-user-id={user.id} onClick={() => onOpenChange(false)} />
  ),
}))

const user: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: Role.AGENT,
  createdAt: '2024-01-01T00:00:00.000Z',
}

describe('EditUserModal', () => {
  it('does not render dialog content when no user is being edited', () => {
    renderWithQuery(<EditUserModal user={null} onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog with a title and the edit form for the given user', () => {
    renderWithQuery(<EditUserModal user={user} onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit User' })).toBeInTheDocument()
    expect(screen.getByTestId('edit-user-form')).toHaveAttribute('data-user-id', 'user-1')
  })

  it('passes onOpenChange through to the form', () => {
    const onOpenChange = vi.fn()
    renderWithQuery(<EditUserModal user={user} onOpenChange={onOpenChange} />)

    screen.getByTestId('edit-user-form').click()

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
