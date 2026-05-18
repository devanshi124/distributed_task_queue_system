import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Ban, ChevronLeft, ChevronRight, Info, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cancelTask } from '@/api/client'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const STATUS_OPTS = ['', 'pending', 'running', 'success', 'failed', 'retrying', 'cancelled']
const PRIORITY_OPTS = ['', 'high', 'medium', 'low']

function ResultDisplay({ content }) {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <div className="space-y-3 font-mono text-xs">
          {Object.entries(parsed).map(([key, value]) => (
            <div key={key} className="break-words">
              <span className="font-semibold text-primary/90 capitalize block mb-1">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-muted-foreground block bg-background/50 p-2 rounded border border-border/50">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
  } catch (e) {
    // Not JSON, fallback to plain text
  }
  return <div className="whitespace-pre-wrap break-words text-sm font-mono">{content}</div>
}

function StatusBadge({ status }) {
  const variants = {
    pending: 'pending', running: 'running', success: 'success',
    failed: 'failed', retrying: 'retrying', cancelled: 'cancelled',
  }
  return (
    <Badge variant={variants[status] || 'outline'} className="capitalize text-[11px]">
      {status === 'running' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse mr-1.5" />
      )}
      {status}
    </Badge>
  )
}

function PriorityBadge({ priority }) {
  const variants = { high: 'high', medium: 'medium', low: 'low' }
  return <Badge variant={variants[priority] || 'outline'} className="capitalize text-[11px]">{priority}</Badge>
}

function TaskRow({ task, onCancelled }) {
  const [cancelling, setCancelling] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const canCancel = task.status === 'pending' || task.status === 'retrying'
  const hasResult = !!task.result || !!task.error

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelTask(task.id)
      toast({ title: 'Task Cancelled', description: `"${task.name}" has been cancelled.`, variant: 'default' })
      onCancelled(task.id)
    } catch (err) {
      toast({ title: 'Cancel Failed', description: err.response?.data?.detail || err.message, variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <TableRow className="animate-slide-in">
      <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[80px] truncate">
        {task.id.slice(0, 8)}
      </TableCell>
      <TableCell>
        <div className="max-w-[180px]">
          <p className="text-sm font-medium truncate">{task.name}</p>
          <p className="text-xs text-muted-foreground truncate">{task.task_type}</p>
        </div>
      </TableCell>
      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
      <TableCell><StatusBadge status={task.status} /></TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {task.retry_count}/{task.max_retries}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {task.created_at
          ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
          : '—'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {task.completed_at
          ? formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })
          : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {hasResult && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResultOpen(true)}
                className="h-7 text-xs gap-1"
              >
                <FileText className="w-3 h-3" />
                {task.error ? 'View Error' : 'Result'}
              </Button>
              <Dialog open={resultOpen} onOpenChange={setResultOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{task.error ? 'Task Error' : 'Task Result'}</DialogTitle>
                    <DialogDescription>
                      {task.error ? 'Error output' : 'Output'} for task {task.name} ({task.id.slice(0, 8)})
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto bg-muted/10 p-4 rounded-md mt-2">
                    <ResultDisplay content={task.error ? task.error : task.result} />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelling}
              onClick={handleCancel}
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-1"
            >
              <Ban className="w-3 h-3" />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 8 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

export default function TaskTable({ tasks, total, page, pageSize, loading, filters, onFiltersChange, onPageChange, onTaskCancelled }) {
  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTS.filter(Boolean).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, priority: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTS.filter(Boolean).map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {total} task{total !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Name / Type</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-20">Retries</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-32">Completed</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TaskRow key={task.id} task={task} onCancelled={onTaskCancelled} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="h-7 gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              className="h-7 gap-1"
            >
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
