import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = {
  pending:   '#f59e0b',
  running:   '#38bdf8',
  success:   '#34d399',
  failed:    '#f87171',
  retrying:  '#fb923c',
  cancelled: '#71717a',
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0]
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <span className="capitalize font-medium">{name}</span>
        <span className="text-muted-foreground ml-2">{value} tasks</span>
      </div>
    )
  }
  return null
}

const renderLegend = (props) => {
  const { payload } = props
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatusDonut({ stats, loading }) {
  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52">
          <Skeleton className="w-40 h-40 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  const data = Object.entries(COLORS)
    .map(([key, color]) => ({ name: key, value: stats?.[key] ?? 0, color }))
    .filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52 text-muted-foreground text-sm">
          No tasks yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
