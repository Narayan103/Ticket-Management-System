import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format-date'
import { REPLY_SENDER_TYPE_LABELS, type ReplySenderType } from '@/types/reply-sender-type'

type Agent = { id: string; name: string }

type Reply = {
  id: number
  body: string
  senderType: ReplySenderType
  createdAt: string
  author: Agent | null
}

type ReplyThreadProps = { replies: Reply[] }

function ReplyThread({ replies }: ReplyThreadProps) {
  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <Card key={reply.id} className="gap-0 p-4">
          <p className="text-sm font-semibold text-foreground">
            {reply.senderType === 'AI' ? 'Support Team' : (reply.author?.name ?? 'Unknown')}
          </p>
          <p className="text-xs text-muted-foreground">
            {REPLY_SENDER_TYPE_LABELS[reply.senderType]} · <span className="font-mono tabular-nums">{formatDateTime(reply.createdAt)}</span>
          </p>
          <p className="mt-2 text-justify text-sm whitespace-pre-wrap text-foreground">{reply.body}</p>
        </Card>
      ))}
    </div>
  )
}

export default ReplyThread
