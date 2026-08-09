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
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReplyInput>({ resolver: zodResolver(createReplySchema) })

  const body = watch('body')

  const mutation = useMutation({
    mutationFn: (data: CreateReplyInput) => apiClient.post(`/api/tickets/${ticketId}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      reset()
    },
  })

  const polishMutation = useMutation({
    mutationFn: (data: CreateReplyInput) =>
      apiClient.post<{ body: string }>(`/api/tickets/${ticketId}/polish-reply`, data).then((res) => res.data),
    onSuccess: (data) => setValue('body', data.body),
  })

  const serverError = getErrorMessage(mutation.error, 'Failed to post reply')
  const polishError = getErrorMessage(polishMutation.error, 'Failed to polish reply')

  const onSubmit = handleSubmit((data) => mutation.mutate(data))
  const onPolish = () => polishMutation.mutate({ body: getValues('body') })

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
        {polishError && <FieldError>{polishError}</FieldError>}
      </FieldGroup>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPolish}
          disabled={!body?.trim() || polishMutation.isPending || mutation.isPending}
        >
          {polishMutation.isPending ? 'Polishing…' : 'Polish'}
        </Button>
        <Button type="submit" disabled={!body?.trim() || mutation.isPending || polishMutation.isPending}>
          {mutation.isPending ? 'Posting…' : 'Post Reply'}
        </Button>
      </div>
    </form>
  )
}

export default ReplyForm
