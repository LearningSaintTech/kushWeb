export function getFromStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

export function setInStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Storage set failed', e)
  }
}

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
