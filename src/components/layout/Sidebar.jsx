import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ListTodo, Zap, Github, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
]

export default function Sidebar({ wsConnected }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col glass border-r border-border/50 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold gradient-text">TaskFlow</h1>
          <p className="text-[10px] text-muted-foreground">Distributed Queue</p>
        </div>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Navigation
        </p>
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border border-transparent',
                isActive
                  ? 'sidebar-item-active text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* WS status */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn(
            'w-2 h-2 rounded-full',
            wsConnected ? 'bg-emerald-400' : 'bg-red-400'
          )} />
          <Activity className="w-3 h-3" />
          <span>{wsConnected ? 'Live' : 'Reconnecting…'}</span>
        </div>
      </div>
    </aside>
  )
}
