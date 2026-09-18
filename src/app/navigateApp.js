/**
 * Leave community (cart, home, …) with a real document navigation.
 * The community feed route can change the URL bar without rematching
 * sibling pages, so SPA navigate() leaves the feed on screen.
 */

function hrefOf(to) {
  if (typeof to === 'string') return to
  if (to && typeof to === 'object') {
    const path = to.pathname || '/'
    const search = to.search || ''
    const hash = to.hash || ''
    return `${path}${search}${hash}`
  }
  return '/'
}

export function navigateApp(to) {
  const href = hrefOf(to) || '/'
  window.location.assign(href)
  return Promise.resolve()
}
