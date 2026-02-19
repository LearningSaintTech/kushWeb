const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export { API_BASE_URL }
