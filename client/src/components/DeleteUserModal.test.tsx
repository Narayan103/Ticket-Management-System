import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import DeleteUserModal from './DeleteUserModal'
import { Role } from '@/types/role'
import type { User } from '@/components/UsersTable'

vi.mock('@/lib/api-client', () => ({
  apiClient: { delete: vi.fn() },
}))

const mockedDelete = vi.mocked(apiClient.delete)

const targetUser: User = {
  id: 'user-1',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  role: Role.AGENT,
  createdAt: '2024-01-01T00:00:00.000Z',
}

function renderModal(user: User | null = targetUser, onOpenChange = vi.fn()) {
  renderWithQuery(<DeleteUserModal user={user} onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

describe('DeleteUserModal', () => {
  beforeEach(() => {
    mockedDelete.mockReset()
  })

  it('does not render dialog content when no user is being deleted', () => {
    renderModal(null)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows a confirmation dialog naming the user', () => {
    renderModal()

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Delete User' })).toBeInTheDocument()
    expect(screen.getByText(/Grace Hopper/)).toBeInTheDocument()
  })

  it('closes without deleting when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockedDelete).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalled()
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false)
  })

  it('deletes the user and closes on confirm', async () => {
    mockedDelete.mockResolvedValue({})
    const user = userEvent.setup()
    const { onOpenChange } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('/api/users/user-1')
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows the server error message and keeps the dialog open when deletion fails', async () => {
    mockedDelete.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Admin users cannot be deleted' } },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Admin users cannot be deleted')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
