import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import EditUserForm from './EditUserForm'
import { Role } from '@/types/role'
import type { User } from '@/components/UsersTable'

vi.mock('@/lib/api-client', () => ({
  apiClient: { put: vi.fn() },
}))

const mockedPut = vi.mocked(apiClient.put)

const existingUser: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: Role.AGENT,
  createdAt: '2024-01-01T00:00:00.000Z',
}

function renderForm(onOpenChange = vi.fn(), user: User = existingUser) {
  renderWithQuery(<EditUserForm user={user} open={true} onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

async function setField(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (value) await user.type(input, value)
}

describe('EditUserForm', () => {
  beforeEach(() => {
    mockedPut.mockReset()
  })

  it('pre-fills the name and email from the user prop, and leaves password blank', () => {
    renderForm()

    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('New Password')).toHaveValue('')
  })

  it('shows a validation error and blocks submission when the name is too short', async () => {
    const user = userEvent.setup()
    renderForm()

    await setField(user, 'Name', 'Al')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('shows a validation error and blocks submission when the email is invalid', async () => {
    const user = userEvent.setup()
    renderForm()

    await setField(user, 'Email', 'notanemail')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('shows a validation error and blocks submission when a new password is too short', async () => {
    const user = userEvent.setup()
    renderForm()

    await setField(user, 'New Password', 'short1')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('submits successfully with an empty password, leaving it unchanged', async () => {
    mockedPut.mockResolvedValue({
      data: { user: { ...existingUser } },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockedPut).toHaveBeenCalledWith('/api/users/user-1', {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: '',
      })
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('submits the updated fields and a new password when provided', async () => {
    mockedPut.mockResolvedValue({
      data: { user: { ...existingUser, name: 'Ada Byron', email: 'ada.byron@example.com' } },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderForm()

    await setField(user, 'Name', 'Ada Byron')
    await setField(user, 'Email', 'ada.byron@example.com')
    await setField(user, 'New Password', 'newpassword123')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockedPut).toHaveBeenCalledWith('/api/users/user-1', {
        name: 'Ada Byron',
        email: 'ada.byron@example.com',
        password: 'newpassword123',
      })
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows the server error message and keeps the form open when submission fails', async () => {
    mockedPut.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'A user with this email already exists' } },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('A user with this email already exists')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
