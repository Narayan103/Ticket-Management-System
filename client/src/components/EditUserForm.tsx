import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateUserSchema, type UpdateUserInput } from 'core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { User } from '@/components/UsersTable'

type EditUserFormProps = { user: User; open: boolean; onOpenChange: (open: boolean) => void }

function EditUserForm({ user, open, onOpenChange }: EditUserFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name, email: user.email, password: '' },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (data: UpdateUserInput) => apiClient.put(`/api/users/${user.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
  })

  const serverError = getErrorMessage(mutation.error, 'Failed to update user')

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="edit-name">Name</FieldLabel>
          <Input id="edit-name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="edit-email">Email</FieldLabel>
          <Input id="edit-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="edit-password">New Password</FieldLabel>
          <Input id="edit-password" type="password" aria-invalid={!!errors.password} {...register('password')} />
          <FieldDescription>Leave blank to keep the current password.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        {serverError && <FieldError>{serverError}</FieldError>}
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default EditUserForm
