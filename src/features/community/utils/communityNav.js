const NAV_IDS = new Set(['home', 'search', 'reels', 'profile', 'create', 'saved'])

export function pathToCommunityNav(pathname) {
  const path = String(pathname || '')
  if (path.includes('/community/feed/saved')) return 'saved'
  if (path.includes('/community/feed/search')) return 'search'
  if (path.includes('/community/feed/reels')) return 'reels'
  if (path.includes('/community/feed/create')) return 'create'
  if (path.includes('/community/feed/profile')) return 'profile'
  return 'home'
}

function readWindowNav() {
  if (typeof window === 'undefined') return 'home'
  return pathToCommunityNav(window.location.pathname)
}

let currentNav = readWindowNav()
const listeners = new Set()

export function getCommunityNav() {
  return currentNav
}

export function subscribeCommunityNav(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCommunityNav(id) {
  const next = NAV_IDS.has(id) ? id : pathToCommunityNav(id)
  if (next === currentNav) {
    listeners.forEach((fn) => fn())
    return next
  }
  currentNav = next
  listeners.forEach((fn) => fn())
  return next
}

export function goCommunity(navigate, id, to, options) {
  setCommunityNav(id)
  if (typeof navigate === 'function' && to) {
    navigate(to, options)
  }
}
