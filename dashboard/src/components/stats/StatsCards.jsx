import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Clock, CircleCheck, CircleX, RotateCcw, Ban, Layers, Play,
  TrendingUp, Timer
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statConfig = [
  { key: 'total',     label: 'Total Tasks',   icon: Layers,        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',   glow: '' },
  { key: 'pending',   label: 'Pending',        icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',  glow: '' },
  { key: 'running',   label: 'Running',        icon: Play,          color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20',    glow: 'glow-blue' },
  { key: 'success',   label: 'Succeeded',      icon: CircleCheck,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',glow: 'glow-green' },
  { key: 'failed',    label: 'Failed',         icon: CircleX,       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',    glow: 'glow-red' },
  { key: 'retrying',  label: 'Retrying',       icon: RotateCcw,     color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20', glow: '' },
  { key: 'cancelled', label: 'Cancelled',      icon: Ban,           color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    border: 'border-zinc-500/20',   glow: '' },
]

function AnimatedNumber({ value }) {
  const [displayed, setDisplayed] = useState(value)

  useEffect(() => {
    if (value === displayed) return
    const diff = value - displayed
    const steps = 20
    const step = diff / steps
    let current = displayed
    let count = 0
    const interval = setInterval(() => {
      count++
      current += step
      setDisplayed(count >= steps ? value : Math.round(current))
      if (count >= steps) clearInterval(interval)
    }, 20)
    return () => clearInterval(interval)
  }, [value])

  return <span>{displayed ?? 0}</span>
}

function StatCard({ config, value, loading }) {
  const { label, icon: Icon, color, bg, border, glow } = config

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5">
          <Skeleton className="h-10 w-10 rounded-lg mb-3" />
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border transition-all duration-300 hover:scale-[1.02] cursor-default', border, glow)}>
      <CardContent className="p-5">
        <div className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div className={cn('text-2xl font-bold', color)}>
          <AnimatedNumber value={value ?? 0} />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon: Icon, label, value, color, loading }) {
  if (loading) return (
    <Card className="border-border/50">
      <CardContent className="p-5 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div><Skeleton className="h-6 w-16 mb-1" /><Skeleton className="h-3 w-24" /></div>
      </CardContent>
    </Card>
  )

  return (
    <Card className="border-border/50 hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20')}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">{value ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StatsCards({ stats, loading }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statConfig.map((cfg) => (
          <StatCard key={cfg.key} config={cfg} value={stats?.[cfg.key]} loading={loading} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Timer}
          label="Avg Duration"
          value={stats?.avg_duration_seconds != null ? `${stats.avg_duration_seconds}s` : '—'}
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Tasks / Minute"
          value={stats?.tasks_per_minute ?? '—'}
          loading={loading}
        />
      </div>
    </div>
  )
}
