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

  it('disables the Post Reply button until the reply body has content', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    expect(screen.getByRole('button', { name: 'Post Reply' })).toBeDisabled()

    await user.type(screen.getByLabelText('Add a Reply'), 'Thanks for reaching out')
    expect(screen.getByRole('button', { name: 'Post Reply' })).not.toBeDisabled()

    await user.clear(screen.getByLabelText('Add a Reply'))
    await user.type(screen.getByLabelText('Add a Reply'), '   ')
    expect(screen.getByRole('button', { name: 'Post Reply' })).toBeDisabled()
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
    await screen.findByRole('button', { name: 'Post Reply' })

    await user.type(screen.getByLabelText('Add a Reply'), 'Another reply')
    expect(screen.getByRole('button', { name: 'Post Reply' })).not.toBeDisabled()
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

  it('disables the Polish button until the reply body has content', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    expect(screen.getByRole('button', { name: 'Polish' })).toBeDisabled()

    await user.type(screen.getByLabelText('Add a Reply'), 'thx for the msg')
    expect(screen.getByRole('button', { name: 'Polish' })).not.toBeDisabled()
  })

  it('sends the draft reply to the polish endpoint and fills in the improved text', async () => {
    mockedPost.mockResolvedValue({ data: { body: 'Thank you for reaching out to us.' } })
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), 'thx for the msg')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/api/tickets/1/polish-reply', { body: 'thx for the msg' })
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Add a Reply')).toHaveValue('Thank you for reaching out to us.')
    })
  })

  it('disables the Polish button and shows a pending label while polishing', async () => {
    let resolvePolish!: (value: { data: { body: string } }) => void
    mockedPost.mockReturnValue(new Promise((resolve) => { resolvePolish = resolve }))
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), 'thx for the msg')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    expect(await screen.findByRole('button', { name: 'Polishing…' })).toBeDisabled()

    resolvePolish({ data: { body: 'Thank you for reaching out.' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Polish' })).not.toBeDisabled()
    })
  })

  it('shows an error message when polishing fails', async () => {
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Failed to polish reply' } },
    })
    const user = userEvent.setup()
    renderWithQuery(<ReplyForm ticketId="1" />)

    await user.type(screen.getByLabelText('Add a Reply'), 'thx for the msg')
    await user.click(screen.getByRole('button', { name: 'Polish' }))

    expect(await screen.findByText('Failed to polish reply')).toBeInTheDocument()
  })
})
