import { useState, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/pages/Dashboard'
import Tasks from '@/pages/Tasks'
import { Toaster } from '@/components/ui/toaster'
import { useWebSocket } from '@/hooks/useWebSocket'

const MAX_FEED = 20

function AppShell() {
  const [wsConnected, setWsConnected] = useState(false)
  const [wsStats, setWsStats] = useState(null)
  const [feedEvents, setFeedEvents] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshRef = useRef(null)
  const disconnectTimerRef = useRef(null)

  const handleTaskUpdate = useCallback((data) => {
    setFeedEvents((prev) => [data, ...prev].slice(0, MAX_FEED))
  }, [])

  const handleStatsUpdate = useCallback((data) => {
    setWsStats(data)
  }, [])

  const handleConnected = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
    }
    setWsConnected(true)
  }, [])

  const handleDisconnected = useCallback(() => {
    disconnectTimerRef.current = setTimeout(() => {
      setWsConnected(false)
    }, 1500) // Wait 1.5s before showing reconnecting state to prevent flicker
  }, [])

  useWebSocket({
    onTaskUpdate: handleTaskUpdate,
    onStatsUpdate: handleStatsUpdate,
    onConnected: handleConnected,
    onDisconnected: handleDisconnected,
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Trigger child refreshes via key increment
    refreshRef.current?.()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar wsConnected={wsConnected} />

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route
              path="/"
              element={<Dashboard wsStats={wsStats} wsEvents={feedEvents} />}
            />
            <Route
              path="/tasks"
              element={<Tasks onTaskCreated={(t) => handleTaskUpdate({ ...t, created_at: new Date().toISOString() })} />}
            />
          </Routes>
        </main>

        <footer className="px-6 py-3 border-t border-border/30 text-center text-[11px] text-muted-foreground">
          TaskFlow Dashboard · Distributed Task Queue System
        </footer>
      </div>

      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
