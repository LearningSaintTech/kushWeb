import { getPublicImageUrl } from '../services/config.js'

/** Keywords used for Shaktiman collection search / section matching. */
export const SHAKTIMAN_KEYWORDS = ['shaktiman', 'shakti man', 'shakti', 'shaktimaan']

function publicFileUrl(filename) {
  return `/${String(filename)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')}`
}

/** `public/` assets — mobile portrait + desktop landscape. */
export const SHAKTIMAN_BANNER_MOBILE = publicFileUrl(
  'phone responsive INDIA banner.jpg.jpeg',
)
export const SHAKTIMAN_BANNER_DESKTOP = publicFileUrl(
  "sneha's banner bank.jpg.jpeg",
)

export function isShaktimanSection(section) {
  if (!section) return false
  const title = String(section.title || section.name || '').toLowerCase()
  const slug = String(section.slug || '').toLowerCase()
  return SHAKTIMAN_KEYWORDS.some((kw) => title.includes(kw) || slug.includes(kw))
}

function extractBannerRawUrl(val) {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) {
    for (const item of val) {
      if (!item) continue
      if (typeof item === 'string' && item.trim()) return item.trim()
      if (typeof item === 'object') {
        const url = item.imageUrl || item.imageKey || item.url || item.src
        if (url) return url
      }
    }
    return ''
  }
  if (typeof val === 'object') {
    return val.imageUrl || val.imageKey || val.url || val.src || ''
  }
  return ''
}

export function getSectionBannerUrls(section) {
  if (!section) return { desktopUrl: '', mobileUrl: '' }
  const desktopRaw =
    extractBannerRawUrl(section.desktopBanner) ||
    extractBannerRawUrl(section.banner) ||
    extractBannerRawUrl(section.image) ||
    extractBannerRawUrl(section.webBanner) ||
    ''
  const mobileRaw =
    extractBannerRawUrl(section.mobileBanner) ||
    extractBannerRawUrl(section.appBanner) ||
    extractBannerRawUrl(section.bannerMobile) ||
    desktopRaw ||
    ''
  return {
    desktopUrl: desktopRaw ? getPublicImageUrl(desktopRaw) : '',
    mobileUrl: mobileRaw ? getPublicImageUrl(mobileRaw) : '',
  }
}

