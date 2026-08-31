import { getPublicImageUrl } from '../services/config.js'

/** Keywords used for Shaktiman collection search / section matching. */
export const SHAKTIMAN_KEYWORDS = ['shaktiman', 'shakti man', 'shakti', 'shaktimaan']

/**
 * Checks whether a section object matches Shaktiman collection.
 */
export function isShaktimanSection(section) {
  if (!section) return false
  const title = String(section?.title || section?.name || '').toLowerCase()
  const slug = String(section?.slug || '').toLowerCase()
  return SHAKTIMAN_KEYWORDS.some((kw) => title.includes(kw) || slug.includes(kw))
}

/**
 * Extracts desktop and mobile banner URLs from a section object.
 * Handles arrays of objects ({ imageUrl }), strings, or single object.
 */
export function getSectionBannerUrls(section) {
  if (!section) return { desktopUrl: '', mobileUrl: '' }

  const extractUrl = (bannerField) => {
    if (!bannerField) return ''
    if (typeof bannerField === 'string') return bannerField
    if (Array.isArray(bannerField) && bannerField.length > 0) {
      const first = bannerField[0]
      if (typeof first === 'string') return first
      return first?.imageUrl || first?.url || ''
    }
    if (typeof bannerField === 'object') {
      return bannerField?.imageUrl || bannerField?.url || ''
    }
    return ''
  }

  const rawDesktop = extractUrl(section.desktopBanner)
  const rawMobile = extractUrl(section.mobileBanner)

  const desktopUrl = rawDesktop ? getPublicImageUrl(rawDesktop) : ''
  const mobileUrl = rawMobile ? getPublicImageUrl(rawMobile) : ''

  return { desktopUrl, mobileUrl }
}
