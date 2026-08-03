import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import UsersPage from './UsersPage'
import type { User } from '@/components/UsersTable'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

vi.mock('@/components/UsersTable', () => ({
  default: ({ users, isPending }: { users: User[]; isPending: boolean }) => (
    <div data-testid="users-table" data-pending={isPending} data-count={users.length} />
  ),
}))

const mockedGet = vi.mocked(apiClient.get)

function renderUsersPage() {
  return renderWithQuery(<UsersPage />)
}

describe('UsersPage', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('passes the pending state to UsersTable while the request is in flight', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderUsersPage()

    expect(screen.getByTestId('users-table')).toHaveAttribute('data-pending', 'true')
    expect(screen.getByTestId('users-table')).toHaveAttribute('data-count', '0')
  })

  it('passes the fetched users to UsersTable once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        users: [
          { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'ADMIN', createdAt: '2024-01-15T00:00:00.000Z' },
          { id: '2', name: 'Grace Hopper', email: 'grace@example.com', role: 'AGENT', createdAt: '2024-02-20T00:00:00.000Z' },
        ],
      },
    })

    renderUsersPage()

    await waitFor(() => {
      expect(screen.getByTestId('users-table')).toHaveAttribute('data-pending', 'false')
    })
    expect(screen.getByTestId('users-table')).toHaveAttribute('data-count', '2')
  })

  it('shows the server error message instead of the table when the request fails', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Not authorized' } },
    })

    renderUsersPage()

    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
    expect(screen.queryByTestId('users-table')).not.toBeInTheDocument()
  })

  it('shows a Create User button above the list', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderUsersPage()

    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument()
  })

  it('opens the create user dialog when the button is clicked', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    renderUsersPage()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument()
  })

  it('closes the create user dialog when the Escape key is pressed', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    renderUsersPage()

    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes the create user dialog when clicking outside of it', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    renderUsersPage()

    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const backdrop = document.querySelector('[data-slot="dialog-overlay"]')
    if (!backdrop) throw new Error('dialog overlay not found')
    await user.click(backdrop)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
