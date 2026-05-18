import { useState, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TaskTable from '@/components/tasks/TaskTable'
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog'
import { fetchTasks } from '@/api/client'

export default function Tasks({ onTaskCreated }) {
  const [tasks, setTasks] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '' })
  const [dialogOpen, setDialogOpen] = useState(false)

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTasks({ ...filters, page, page_size: PAGE_SIZE })
      setTasks(data.tasks)
      setTotal(data.total)
    } catch (e) {
      console.error('Failed to fetch tasks', e)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  // Auto-refresh removed to prevent page reloading
  // useEffect(() => {
  //   const interval = setInterval(load, 5000)
  //   return () => clearInterval(interval)
  // }, [load])

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleTaskCancelled = (taskId) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'cancelled' } : t))
  }

  const handleTaskCreated = (task) => {
    onTaskCreated?.(task)
    load()
  }

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Tasks</h3>
          <p className="text-xs text-muted-foreground">{total} total tasks in the queue</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      <TaskTable
        tasks={tasks}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onPageChange={(p) => setPage(p)}
        onTaskCancelled={handleTaskCancelled}
      />

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleTaskCreated}
      />
    </div>
  )
}
