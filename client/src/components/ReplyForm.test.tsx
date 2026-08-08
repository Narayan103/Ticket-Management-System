import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import ReplyForm from './ReplyForm'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))

const mockedPost = vi.mocked(apiClient.post)

describe('ReplyForm', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('renders the label, placeholder, and submit button', () => {
    renderWithQuery(<ReplyForm ticketId="1" />)

    expect(screen.getByLabelText('Add a Reply')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Post Reply' })).toBeInTheDocument()
  })

  it('shows a validation error and blocks submission when the reply body is empty', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    expect(await screen.findByText('Reply cannot be empty')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('shows a validation error and blocks submission when the reply body is only whitespace', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), '   ')
    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    expect(await screen.findByText('Reply cannot be empty')).toBeInTheDocument()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('marks the textarea as aria-invalid when validation fails, and clears it once corrected', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Post Reply' }))
    await screen.findByText('Reply cannot be empty')
    expect(screen.getByLabelText('Add a Reply')).toHaveAttribute('aria-invalid', 'true')

    await user.type(screen.getByLabelText('Add a Reply'), 'Thanks for reaching out')
    mockedPost.mockResolvedValue({ data: { reply: {} } })
    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Add a Reply')).toHaveAttribute('aria-invalid', 'false')
    })
  })

  it('disables the submit button and shows a pending label while the request is in flight', async () => {
    let resolvePost!: (value: { data: { reply: object } }) => void
    mockedPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), 'Thanks for reaching out')
    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    expect(await screen.findByRole('button', { name: 'Posting…' })).toBeDisabled()

    resolvePost({ data: { reply: {} } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post Reply' })).not.toBeDisabled()
    })
  })

  it('submits the trimmed reply body and resets the form on success', async () => {
    mockedPost.mockResolvedValue({
      data: { reply: { id: 1, body: 'Thanks for reaching out', senderType: 'AGENT', createdAt: '2024-01-15T00:00:00.000Z', author: { id: 'agent-1', name: 'Agent Smith' } } },
    })
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), '  Thanks for reaching out  ')
    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/api/tickets/1/replies', { body: 'Thanks for reaching out' })
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Add a Reply')).toHaveValue('')
    })
  })

  it('shows the server error message when submission fails', async () => {
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Failed to post reply' } },
    })
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), 'Thanks for reaching out')
    await user.click(screen.getByRole('button', { name: 'Post Reply' }))

    expect(await screen.findByText('Failed to post reply')).toBeInTheDocument()
  })
})
