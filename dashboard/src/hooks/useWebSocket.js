import { useEffect, useRef, useCallback } from 'react'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-api`
const RECONNECT_DELAY = 3000

export function useWebSocket({ onTaskUpdate, onStatsUpdate, onConnected, onDisconnected } = {}) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected')
        onConnected?.()
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'task_update') {
            onTaskUpdate?.(msg.data)
          } else if (msg.type === 'stats_update') {
            onStatsUpdate?.(msg.data)
          }
        } catch (e) {
          console.warn('[WS] Failed to parse message', e)
        }
      }

      ws.onclose = () => {
        console.log('[WS] Disconnected — reconnecting in', RECONNECT_DELAY, 'ms')
        onDisconnected?.()
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
        }
      }

      ws.onerror = (err) => {
        console.warn('[WS] Error', err)
        ws.close()
      }
    } catch (e) {
      console.warn('[WS] Could not create WebSocket', e)
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }
    }
  }, [onTaskUpdate, onStatsUpdate, onConnected, onDisconnected])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const subscribeToTask = useCallback((taskId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', task_id: taskId }))
    }
  }, [])

  return { subscribeToTask }
}
