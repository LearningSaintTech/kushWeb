import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ANDROID_STORE_URL, IOS_STORE_URL } from '../../utils/openKhushApp.js'

/**
 * Fallback when CloudFront has not redirected yet.
 * /go/{product-name}/{id}
 */
export default function ProductShareLinkPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const productId = id || slug
  const nameSlug = id ? slug : ''

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || ''
    if (/android/i.test(ua)) {
      window.location.replace(ANDROID_STORE_URL)
      return
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      window.location.replace(IOS_STORE_URL)
      return
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
