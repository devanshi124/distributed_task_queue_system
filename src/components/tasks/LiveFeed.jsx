import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const statusMeta = {
  pending:   { label: 'Pending',   variant: 'pending' },
  running:   { label: 'Running',   variant: 'running' },
  success:   { label: 'Success',   variant: 'success' },
  failed:    { label: 'Failed',    variant: 'failed' },
  retrying:  { label: 'Retrying', variant: 'retrying' },
  cancelled: { label: 'Cancelled',variant: 'cancelled' },
}

function FeedItem({ event, isNew }) {
  const meta = statusMeta[event.status] || { label: event.status, variant: 'outline' }
  return (
    <div className={cn(
      'flex items-start justify-between gap-3 py-2.5 px-3 rounded-lg transition-all duration-500',
      isNew ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent/30'
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
        <p className="text-xs text-muted-foreground truncate">{event.task_type || event.id?.slice(0, 8)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge variant={meta.variant} className="text-[10px] py-0">
          {event.status === 'running' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse mr-1" />
          )}
          {meta.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {event.created_at
            ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true })
            : 'just now'}
        </span>
      </div>
    </div>
  )
}

export default function LiveFeed({ events }) {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events.length])

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
          Live Task Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={listRef} className="max-h-72 overflow-y-auto px-3 pb-3 space-y-1">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Waiting for task events…
            </p>
          )}
          {events.map((event, i) => (
            <FeedItem key={`${event.id}-${event.status}-${i}`} event={event} isNew={i === 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
