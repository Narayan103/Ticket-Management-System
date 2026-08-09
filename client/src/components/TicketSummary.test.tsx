import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/lib/api-client'
import { renderWithQuery } from '@/test-utils'
import TicketSummary from './TicketSummary'

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))

const mockedPost = vi.mocked(apiClient.post)

describe('TicketSummary', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('renders the Summarize button and no summary initially', () => {
    renderWithQuery(<TicketSummary ticketId="1" />)

    expect(screen.getByRole('button', { name: 'Summarize' })).toBeInTheDocument()
    expect(screen.queryByText(/summary/i)).not.toBeInTheDocument()
  })

  it('requests a summary and displays it on success', async () => {
    mockedPost.mockResolvedValue({ data: { summary: 'Customer needs a refund; agent is investigating.' } })
    const user = userEvent.setup()
    renderWithQuery(<TicketSummary ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Summarize' }))

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/api/tickets/1/summarize')
    })
    expect(await screen.findByText('Customer needs a refund; agent is investigating.')).toBeInTheDocument()
  })

  it('disables the button and shows a pending label while summarizing', async () => {
    let resolvePost!: (value: { data: { summary: string } }) => void
    mockedPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))
    const user = userEvent.setup()
    renderWithQuery(<TicketSummary ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Summarize' }))

    expect(await screen.findByRole('button', { name: 'Summarizing…' })).toBeDisabled()

    resolvePost({ data: { summary: 'A summary.' } })
    await screen.findByRole('button', { name: 'Summarize' })
  })

  it('regenerates the summary on every click, replacing the previous one', async () => {
    mockedPost.mockResolvedValueOnce({ data: { summary: 'First summary.' } })
    const user = userEvent.setup()
    renderWithQuery(<TicketSummary ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Summarize' }))
    expect(await screen.findByText('First summary.')).toBeInTheDocument()

    mockedPost.mockResolvedValueOnce({ data: { summary: 'Second summary.' } })
    await user.click(screen.getByRole('button', { name: 'Summarize' }))

    expect(await screen.findByText('Second summary.')).toBeInTheDocument()
    expect(screen.queryByText('First summary.')).not.toBeInTheDocument()
    expect(mockedPost).toHaveBeenCalledTimes(2)
  })

  it('shows an error message when summarizing fails', async () => {
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Failed to summarize ticket' } },
    })
    const user = userEvent.setup()
    renderWithQuery(<TicketSummary ticketId="1" />)

    await user.click(screen.getByRole('button', { name: 'Summarize' }))

    expect(await screen.findByText('Failed to summarize ticket')).toBeInTheDocument()
  })
})
