/** Product IDs that stay locked as Shaktiman coming-soon (blur + lock + tag). */
export const SHAKTIMAN_COMING_SOON_IDS = new Set([
  '6a776572cc851f6f5907afff', // Shaktimaan Dark Pulse Tank
  '6a77654ccc851f6f5907ae7a', // Shaktimaan Dark Pulse Jogger
  '6a776221cc851f6f59078de6', // Shaktiman active neo crop top / Dark Pulse Tank
  '6a776521cc851f6f5907ac50',
])

/** Keywords used for Shaktiman collection search / section matching. */
export const SHAKTIMAN_KEYWORDS = ['shaktiman', 'shakti man', 'shakti', 'shaktimaan']

export function isShaktimanComingSoonId(id) {
  if (id == null) return false
  return SHAKTIMAN_COMING_SOON_IDS.has(String(id))
}

/**
 * True when an item should show Shaktiman coming-soon lock
 * (exact product IDs, or name/tags containing Shaktiman).
 */
export function isShaktimanComingSoonItem(item) {
  if (!item || typeof item !== 'object') return false

  const id = item._id ?? item.id
  if (isShaktimanComingSoonId(id)) return true

  const parts = [
    item.name,
    item.title,
    item.shortDescription,
    item.description,
    item.slug,
    item.sku,
    ...(Array.isArray(item.tags) ? item.tags : []),
    item.collection?.name,
    item.collection?.title,
    item.collection?.slug,
    item.category?.name,
    item.category?.slug,
  ]

  if (Array.isArray(item.collections)) {
    for (const c of item.collections) {
      parts.push(c?.name, c?.title, c?.slug)
    }
  }
  if (Array.isArray(item.categories)) {
    for (const c of item.categories) {
      parts.push(c?.name, c?.slug)
    }
  }

  const hay = parts.filter(Boolean).join(' ').toLowerCase()
  if (!hay) return false

  return (
    hay.includes('shaktimaan') ||
    hay.includes('shaktiman') ||
    hay.includes('shakti man')
  )
}
