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
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{reply.author?.name ?? 'Unknown'}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            {REPLY_SENDER_TYPE_LABELS[reply.senderType]} · {formatDateTime(reply.createdAt)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">{reply.body}</p>
        </Card>
      ))}
    </div>
  )
}

export default ReplyThread
