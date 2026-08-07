import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/context/AuthContext'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { useCommunityRole } from '../hooks/useCommunityRole'
import { resolveCommunityDestination } from '../utils/resolveCommunityDestination'
import { ROUTES } from '../../../utils/constants'
import { debugLog } from '../../../utils/debugLog'

/**
 * Auth gate + role router for community entry.
 * Guests → login modal (redirect back here after login).
 * Authed → feed or profile dashboard from community-profile flags.
 */
export default function CommunityEnterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const { profile, refresh } = useCommunityProfile()
  const role = useCommunityRole()
  const askedLogin = useRef(false)
  const redirected = useRef(false)

  useEffect(() => {
    if (!authChecked || redirected.current) return

    if (!isAuthenticated) {
      if (!askedLogin.current) {
        askedLogin.current = true
        debugLog('[CommunityProfile] enter: guest → open login modal')
        openAuthModal(ROUTES.COMMUNITY_ENTER)
      }
      return
    }

    askedLogin.current = false
    let cancelled = false

    ;(async () => {
      try {
        const latest = profile ?? (await refresh())
        if (cancelled || redirected.current) return
        const destination = resolveCommunityDestination(latest, role)
        debugLog('[CommunityProfile] enter: redirect', {
          role,
          isCreator: latest?.isCreator,
          isDesigner: latest?.isDesigner,
          destination,
        })
        redirected.current = true
        navigate(destination, { replace: true })
      } catch {
        if (cancelled || redirected.current) return
        redirected.current = true
        navigate(ROUTES.COMMUNITY_FEED, { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authChecked, isAuthenticated, openAuthModal, navigate, profile, refresh, role])

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white px-4 pt-28">
      <p className="font-inter text-sm text-neutral-500">
        {!isAuthenticated ? 'Sign in to explore community…' : 'Opening your community…'}
      </p>
    </div>
  )
}
