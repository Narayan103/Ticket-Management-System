import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, type CreateUserInput } from 'core'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type CreateUserFormProps = { open: boolean; onOpenChange: (open: boolean) => void }

function CreateUserForm({ open, onOpenChange }: CreateUserFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (data: CreateUserInput) => apiClient.post('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
  })

  const serverError = mutation.error
    ? axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data?.error ?? mutation.error.message)
      : 'Failed to create user'
    : null

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" type="password" aria-invalid={!!errors.password} {...register('password')} />
          <FieldError errors={[errors.password]} />
        </Field>
        {serverError && <FieldError>{serverError}</FieldError>}
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create User'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default CreateUserForm
