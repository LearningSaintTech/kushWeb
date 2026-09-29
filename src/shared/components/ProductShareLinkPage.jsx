import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ANDROID_STORE_URL, IOS_STORE_URL } from '../../utils/openKhushApp.js'

const ANDROID_PACKAGE = 'com.khushpehno.app'

/**
 * Fallback if /go is served by the website instead of the share page.
 * Tries the installed app, then the store.
 */
export default function ProductShareLinkPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const productId = id || slug
  const nameSlug = id ? slug : ''

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || ''
    const deepLink = `khushpehno://product/${productId}`
    if (/android/i.test(ua)) {
      // No browser_fallback_url: when the app is missing, Chrome opens the Play Store app itself.
      const intent =
        `intent://product/${productId}#Intent;scheme=khushpehno;package=${ANDROID_PACKAGE};end`
      window.location.href = intent
      const toStore = window.setTimeout(() => {
        if (document.hidden) return
        window.location.href = `market://details?id=${ANDROID_PACKAGE}`
      }, 800)
      const toWebStore = window.setTimeout(() => {
        if (document.hidden) return
        window.location.href = ANDROID_STORE_URL
      }, 1600)
      return () => {
        window.clearTimeout(toStore)
        window.clearTimeout(toWebStore)
      }
    }
    const isIos =
      /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    if (isIos) {
      let opened = false
      const mark = () => {
        opened = true
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) mark()
      })
      window.addEventListener('pagehide', mark)
      window.location.href = deepLink
      const timer = window.setTimeout(() => {
        if (opened || document.hidden) return
        window.location.href = IOS_STORE_URL
      }, 1500)
      return () => window.clearTimeout(timer)
    }
    const path = nameSlug
      ? `/product/${nameSlug}/${productId}`
      : `/product/${productId}`
    navigate(path, { replace: true })
  }, [nameSlug, navigate, productId])

  const label = nameSlug ? nameSlug.replace(/-/g, ' ') : 'this product'
  return (
    <p style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      Opening {label}...
    </p>
  )
}
