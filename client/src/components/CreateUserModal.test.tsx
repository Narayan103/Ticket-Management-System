import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '@/test-utils'
import CreateUserModal from './CreateUserModal'

vi.mock('@/components/CreateUserForm', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    <div data-testid="create-user-form" data-open={open} onClick={() => onOpenChange(false)} />
  ),
}))

describe('CreateUserModal', () => {
  it('does not render dialog content when closed', () => {
    renderWithQuery(<CreateUserModal open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog with a title and the create user form when open', () => {
    renderWithQuery(<CreateUserModal open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument()
    expect(screen.getByTestId('create-user-form')).toHaveAttribute('data-open', 'true')
  })

  it('passes onOpenChange through to the form', () => {
    const onOpenChange = vi.fn()
    renderWithQuery(<CreateUserModal open={true} onOpenChange={onOpenChange} />)

    screen.getByTestId('create-user-form').click()

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
