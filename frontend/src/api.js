// Thin API client for the PRAHARI backend.
// Uses VITE_API_BASE_URL when set (deployed), else same-origin via the dev proxy.
const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  // DRISHTI
  events: ({ sector, severity, minScore } = {}) => {
    const q = new URLSearchParams()
    if (sector) q.set('sector', sector)
    if (severity) q.set('severity', severity)
    if (minScore) q.set('min_score', minScore)
    return get(`/api/drishti/events?${q.toString()}`)
  },
  brief: (eventId, language = 'en') =>
    get(`/api/drishti/events/${encodeURIComponent(eventId)}/brief?language=${language}`),
  ask: (question, language = 'en') => post('/api/drishti/ask', { question, language }),

  // RAKKHOK
  readiness: () => get('/api/rakkhok/readiness'),
  assets: (force) => get(`/api/rakkhok/assets${force ? `?force=${force}` : ''}`),
  rulRanking: (limit = 8) => get(`/api/rakkhok/rul-ranking?limit=${limit}`),
  fleetAlerts: () => get('/api/rakkhok/alerts'),
}
