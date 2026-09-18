import { getPublicSiteOrigin } from '../../../services/config'
import { getCommunityReelsPath, ROUTES } from '../../../utils/constants'

function siteOrigin() {
  return getPublicSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '')
}

async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return true
}

export async function shareUrl({ url, title, text }) {
  if (!url) return { success: false, method: 'no_url' }
  const shareData = { title: title || 'Khush Community', text: text || '', url }

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (!navigator.canShare || navigator.canShare(shareData))

  if (canNativeShare) {
    try {
      await navigator.share(shareData)
      return { success: true, method: 'native', url }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'aborted', url }
      }
    }
  }

  try {
    await copyText(url)
    return { success: true, method: 'clipboard', url }
  } catch {
    return { success: false, method: 'failed', url }
  }
}

/**
 * Share profile helper with Web Share API and Clipboard fallback.
 */
export async function shareCommunityProfile({ id, name, handle }) {
  const profileId = id != null && id !== '' ? String(id) : null
  if (!profileId) return { success: false, method: 'no_id' }

  const url = `${siteOrigin()}${ROUTES.COMMUNITY_FEED}?profileId=${encodeURIComponent(profileId)}`
  const title = name ? `${name} on Khush Community` : 'Khush Community Profile'
  const text = `Check out ${name || 'this creator'} (@${handle || 'creator'}) on Khush!`
  return shareUrl({ url, title, text })
}

export function communityContentShareUrl(item) {
  const id = item?.id || item?._id
  if (!id) return ''
  const origin = siteOrigin()
  const type = String(item?.type || '').toLowerCase()
  if (type === 'reel' || type === 'video') {
    return `${origin}${getCommunityReelsPath(id)}`
  }
  return `${origin}${ROUTES.COMMUNITY_FEED}?postId=${encodeURIComponent(String(id))}`
}

export async function shareCommunityContent(item) {
  const url = communityContentShareUrl(item)
  if (!url) return { success: false, method: 'no_id' }
  const isReel = String(item?.type || '').toLowerCase() === 'reel'
  const title = isReel ? 'Khush Reel' : 'Khush Post'
  const text = item?.caption
    ? `${item.caption} — on Khush`
    : `Check out this ${isReel ? 'reel' : 'post'} on Khush`
  return shareUrl({ url, title, text })
}
