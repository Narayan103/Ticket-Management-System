import { Card, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/format-date'

type TicketDetailProps = {
  subject: string
  fromName: string
  fromEmail: string
  createdAt: string
  updatedAt: string
  body: string
}

function TicketDetail({ subject, fromName, fromEmail, createdAt, updatedAt, body }: TicketDetailProps) {
  return (
    <div>
      <CardTitle className="text-xl">{subject}</CardTitle>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div>
          <span className="text-neutral-500 dark:text-neutral-500">From: </span>
          {fromName} ({fromEmail})
        </div>
        <div>
          <span className="text-neutral-500 dark:text-neutral-500">Created: </span>
          {formatDateTime(createdAt)}
        </div>
        <div>
          <span className="text-neutral-500 dark:text-neutral-500">Updated: </span>
          {formatDateTime(updatedAt)}
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Message</p>
        <Card className="mt-2 gap-0 p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-500">From {fromName}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">{body}</p>
        </Card>
      </div>
    </div>
  )
}

export default TicketDetail
