import DOMPurify from 'dompurify'
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
  bodyHtml?: string | null
}

function TicketDetail({ subject, fromName, fromEmail, createdAt, updatedAt, body, bodyHtml }: TicketDetailProps) {
  return (
    <div>
      <CardTitle className="text-xl">{subject}</CardTitle>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div>
          <span className="text-muted-foreground">From: </span>
          {fromName} ({fromEmail})
        </div>
        <div>
          <span className="text-muted-foreground">Created: </span>
          <span className="font-mono tabular-nums">{formatDateTime(createdAt)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Updated: </span>
          <span className="font-mono tabular-nums">{formatDateTime(updatedAt)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <p className="text-sm font-semibold text-foreground">Message</p>
        <Card className="mt-2 gap-0 p-4">
          <p className="text-xs text-muted-foreground">From {fromName}</p>
          {bodyHtml ? (
            <div
              className="mt-2 text-sm text-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
            />
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{body}</p>
          )}
        </Card>
      </div>
    </div>
  )
}

export default TicketDetail
