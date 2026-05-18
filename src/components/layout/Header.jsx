import { useLocation } from 'react-router-dom'
import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const titles = {
  '/': { title: 'Dashboard', subtitle: 'Real-time task queue overview' },
  '/tasks': { title: 'Task Manager', subtitle: 'Browse, filter and manage all tasks' },
}

export default function Header({ onRefresh, isRefreshing }) {
  const location = useLocation()
  const { title, subtitle } = titles[location.pathname] || titles['/']

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </header>
  )
}
