import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Tasks ──────────────────────────────────────────────────────────────────

export async function fetchTasks({ status, priority, page = 1, page_size = 20 } = {}) {
  const params = { page, page_size }
  if (status) params.status = status
  if (priority) params.priority = priority
  const { data } = await api.get('/tasks', { params })
  return data
}

export async function fetchTask(taskId) {
  const { data } = await api.get(`/tasks/${taskId}`)
  return data
}

export async function createTask(payload) {
  const { data } = await api.post('/tasks', payload)
  return data
}

export async function cancelTask(taskId) {
  const { data } = await api.delete(`/tasks/${taskId}`)
  return data
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function fetchStats() {
  const { data } = await api.get('/tasks/stats/summary')
  return data
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function fetchHealth() {
  const { data } = await api.get('/health')
  return data
}

export default api
