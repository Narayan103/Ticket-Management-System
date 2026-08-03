import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import CreateUserForm from './CreateUserForm'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))

const mockedPost = vi.mocked(apiClient.post)

function renderForm(onOpenChange = vi.fn()) {
  renderWithQuery(<CreateUserForm open={true} onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, values: { name?: string; email?: string; password?: string }) {
  if (values.name !== undefined) await user.type(screen.getByLabelText('Name'), values.name)
  if (values.email !== undefined) await user.type(screen.getByLabelText('Email'), values.email)
  if (values.password !== undefined) await user.type(screen.getByLabelText('Password'), values.password)
}

describe('CreateUserForm', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('shows a validation error and blocks submission when the name is too short', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillForm(user, { name: 'Al', email: 'ada@example.com', password: 'password123' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('marks invalid fields with aria-invalid so the red border shows, and leaves valid fields alone', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillForm(user, { name: 'Al', email: 'ada@example.com', password: 'short1' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await screen.findByText('Name must be at least 3 characters')
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows a validation error and blocks submission when the email is invalid', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillForm(user, { name: 'Ada Lovelace', email: 'notanemail', password: 'password123' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('shows a validation error and blocks submission when the password is too short', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillForm(user, { name: 'Ada Lovelace', email: 'ada@example.com', password: 'short1' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('submits the form and closes the modal on success', async () => {
    mockedPost.mockResolvedValue({
      data: {
        user: { id: '3', name: 'Ada Lovelace', email: 'ada@example.com', role: 'AGENT', createdAt: '2024-01-01T00:00:00.000Z' },
      },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderForm()

    await fillForm(user, { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/api/users', {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'password123',
      })
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows the server error message and keeps the form open when submission fails', async () => {
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'A user with this email already exists' } },
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderForm()

    await fillForm(user, { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' })
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('A user with this email already exists')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
