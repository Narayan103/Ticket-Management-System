import { useEffect } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { FieldError } from '@/components/ui/field'
import type { User } from '@/components/UsersTable'

type DeleteUserModalProps = { user: User | null; onOpenChange: (open: boolean) => void }

function DeleteUserModal({ user, onOpenChange }: DeleteUserModalProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (user === null) mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const serverError = mutation.error
    ? axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.error ?? mutation.error.message)
      : 'Failed to delete user'
    : null

  return (
    <AlertDialog open={user !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {user?.name}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {serverError && <FieldError>{serverError}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => {
              if (user) mutation.mutate(user.id)
            }}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteUserModal
