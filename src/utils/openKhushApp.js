export const ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.khushpehno.app'
export const IOS_STORE_URL =
  'https://apps.apple.com/in/app/khush-fashion-shopping-app/id6761365897'
export const ANDROID_PACKAGE = 'com.khushpehno.app'

export function isPhoneDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  if (/iPad/i.test(ua)) return false
  return /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry/i.test(ua)
}

export function getAppStoreUrl() {
  if (typeof navigator === 'undefined') return ANDROID_STORE_URL
  const ua = navigator.userAgent || navigator.vendor || ''
  if (/iPhone|iPod|iPad/i.test(ua)) return IOS_STORE_URL
  return ANDROID_STORE_URL
}

/** Try to open the Khush app, then fall back to the store. */
export function openKhushApp(pathWithSearch = '/community') {
  if (typeof window === 'undefined') return
  const path = pathWithSearch.startsWith('/') ? pathWithSearch : `/${pathWithSearch}`
  const store = getAppStoreUrl()
  const ua = navigator.userAgent || ''

  if (/android/i.test(ua)) {
    const host = window.location.host
    const intent = `intent://${host}${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(store)};end`
    window.location.href = intent
    return
  }

  window.location.href = store
}
