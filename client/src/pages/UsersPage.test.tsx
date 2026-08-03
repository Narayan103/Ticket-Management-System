import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import UsersPage from './UsersPage'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}))

vi.mock('@/components/CreateUserModal', () => ({
  default: ({ open }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="create-user-modal" data-open={open} />
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

  it('shows a loading skeleton while the request is pending', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    const { container } = renderUsersPage()

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders users once the request resolves', async () => {
    mockedGet.mockResolvedValue({
      data: {
        users: [
          {
            id: '1',
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            role: 'ADMIN',
            createdAt: '2024-01-15T00:00:00.000Z',
          },
          {
            id: '2',
            name: 'Grace Hopper',
            email: 'grace@example.com',
            role: 'AGENT',
            createdAt: '2024-02-20T00:00:00.000Z',
          },
        ],
      },
    })

    renderUsersPage()

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('AGENT')).toBeInTheDocument()
  })

  it('shows an empty state when there are no users', async () => {
    mockedGet.mockResolvedValue({ data: { users: [] } })

    renderUsersPage()

    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  it('shows the server error message when the request fails', async () => {
    mockedGet.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Not authorized' } },
    })

    renderUsersPage()

    expect(await screen.findByText('Not authorized')).toBeInTheDocument()
  })

  it('shows a Create User button above the list', () => {
    mockedGet.mockReturnValue(new Promise(() => {}))

    renderUsersPage()

    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument()
  })

  it('opens the create user modal when the button is clicked', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()

    renderUsersPage()

    expect(screen.getByTestId('create-user-modal')).toHaveAttribute('data-open', 'false')

    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(screen.getByTestId('create-user-modal')).toHaveAttribute('data-open', 'true')
  })
})
