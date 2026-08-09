import { useMutation } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'

type TicketSummaryProps = { ticketId: string }

function TicketSummary({ ticketId }: TicketSummaryProps) {
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ summary: string }>(`/api/tickets/${ticketId}/summarize`).then((res) => res.data),
  })

  const errorMessage = getErrorMessage(mutation.error, 'Failed to summarize ticket')

  return (
    <div>
      <Button type="button" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        <Sparkles data-icon="inline-start" />
        {mutation.isPending ? 'Summarizing…' : 'Summarize'}
      </Button>
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
      {mutation.data && (
        <Card className="mt-3 p-4">
          <p className="text-sm whitespace-pre-wrap text-neutral-900 dark:text-neutral-50">{mutation.data.summary}</p>
        </Card>
      )}
    </div>
  )
}

export default TicketSummary
