/**
 * Share profile helper with Web Share API and Clipboard fallback.
 */
export async function shareCommunityProfile({ id, name, handle }) {
  const profileId = id != null && id !== '' ? String(id) : null
  if (!profileId) return { success: false, method: 'no_id' }

  const url = `${window.location.origin}/community/feed?profileId=${encodeURIComponent(profileId)}`
  const title = name ? `${name} on Khush Community` : 'Khush Community Profile'
  const text = `Check out ${name || 'this creator'} (@${handle || 'creator'}) on Khush!`

  const shareData = { title, text, url }

  // 1. Try native Web Share API (mobile & supported browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData)
      return { success: true, method: 'native' }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'aborted' }
      }
    }
  }

  // 2. Try modern Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return { success: true, method: 'clipboard', url }
    } catch {
      // Continue to fallback
    }
  }

  // 3. Fallback textarea copy for older environments
  try {
    const el = document.createElement('textarea')
    el.value = url
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    return { success: true, method: 'clipboard', url }
  } catch {
    return { success: false, method: 'failed' }
  }
}
