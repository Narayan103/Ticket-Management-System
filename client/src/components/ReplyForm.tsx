import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createReplySchema, type CreateReplyInput } from 'core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type ReplyFormProps = { ticketId: string }

function ReplyForm({ ticketId }: ReplyFormProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({ resolver: zodResolver(createReplySchema) })

  const mutation = useMutation({
    mutationFn: (data: CreateReplyInput) => apiClient.post(`/api/tickets/${ticketId}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      reset()
    },
  })

  const serverError = getErrorMessage(mutation.error, 'Failed to post reply')

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.body}>
          <FieldLabel htmlFor="reply-body">Add a Reply</FieldLabel>
          <Textarea
            id="reply-body"
            placeholder="Type your reply..."
            aria-invalid={!!errors.body}
            {...register('body')}
          />
          <FieldError errors={[errors.body]} />
        </Field>
        {serverError && <FieldError>{serverError}</FieldError>}
      </FieldGroup>
      <Button type="submit" className="mt-3" disabled={mutation.isPending}>
        {mutation.isPending ? 'Posting…' : 'Post Reply'}
      </Button>
    </form>
  )
}

export default ReplyForm
