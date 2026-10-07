import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE_URL } from '../../services/config.js'
import { getCurrentAccessToken } from '../../services/axiosClient.js'
import { captureUtmFromUrl } from '../../analytics/utm.js'
import { getOrCreateAnonymousId, getOrCreateSessionId } from '../../analytics/session.js'

function deviceType() {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

/**
 * /r/:code — tracked offer link (WhatsApp broadcasts, shared offer links).
 * Records the click, stores the campaign attribution, then opens the offer page.
 */
export default function TrackedLinkRedirectPage() {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({
      anonymousId: getOrCreateAnonymousId(),
      sessionId: getOrCreateSessionId(),
      deviceType: deviceType(),
    })
    const token = getCurrentAccessToken()

    fetch(`${API_BASE_URL}/notification/links/resolve/${encodeURIComponent(code || '')}?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        const redirectUrl = json?.data?.redirectUrl
        if (!redirectUrl) {
          navigate('/', { replace: true })
          return
        }
        captureUtmFromUrl(redirectUrl)
        const target = new URL(redirectUrl)
        if (target.origin === window.location.origin) {
          navigate(`${target.pathname}${target.search}${target.hash}`, { replace: true })
        } else {
          window.location.replace(redirectUrl)
        }
      })
      .catch(() => {
        if (!cancelled) navigate('/', { replace: true })
      })

    return () => {
      cancelled = true
    }
  }, [code, navigate])

  return (
    <p style={{ padding: '16px', fontFamily: 'sans-serif' }}>
      Opening your offer…
    </p>
  )
}
