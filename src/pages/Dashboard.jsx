import { useState, useCallback, useEffect } from 'react'
import StatsCards from '@/components/stats/StatsCards'
import StatusDonut from '@/components/charts/StatusDonut'
import LiveFeed from '@/components/tasks/LiveFeed'
import { fetchStats } from '@/api/client'

const MAX_FEED_ITEMS = 20

export default function Dashboard({ wsStats, wsEvents }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchStats()
      setStats(data)
    } catch (e) {
      console.error('Failed to load stats', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Merge live stats from WebSocket
  const liveStats = wsStats ?? stats

  return (
    <div className="space-y-6 animate-slide-in">
      <StatsCards stats={liveStats} loading={loading && !wsStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <StatusDonut stats={liveStats} loading={loading && !wsStats} />
        </div>
        <div className="lg:col-span-2">
          <LiveFeed events={wsEvents} />
        </div>
      </div>
    </div>
  )
}
