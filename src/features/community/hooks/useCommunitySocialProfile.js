/**
 * Load social community profile (GET /community/profile/me | /profile/:userId).
 * Separate from onboarding profile (/user/community-profile).
 */

import { useCallback, useEffect, useState } from 'react'
import { communityService } from '../../../services/community.service.js'
import { mapSocialProfile } from '../../../services/communityContent.mappers.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'

export const COMMUNITY_PROFILE_REFRESH_EVENT = 'khush:community-profile-refresh'

export function requestCommunityProfileRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COMMUNITY_PROFILE_REFRESH_EVENT))
}

/**
 * @param {{ userId?: string|null, enabled?: boolean }} options
 * omit userId / null → own profile via /profile/me
 */
export function useCommunitySocialProfile(options = {}) {
  const { userId = null, enabled = true } = options
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled) return null
    setLoading(true)
    setError(null)
    try {
      const raw = userId
        ? await communityService.getProfile(userId)
        : await communityService.getMyProfile()
      const mapped = mapSocialProfile(raw)
      if (!userId && mapped) mapped.isOwnProfile = true
      debugLog('[Community] social profile ok', {
        userId: mapped?.id,
        own: mapped?.isOwnProfile,
        stats: mapped?.statsRaw,
        posts: mapped?.mediaByTab?.Posts?.length,
      })
      setProfile(mapped)
      return mapped
    } catch (err) {
      debugError('[Community] social profile failed', err?.message)
      setError(err)
      setProfile(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const raw = userId
          ? await communityService.getProfile(userId)
          : await communityService.getMyProfile()
        if (cancelled) return
        const mapped = mapSocialProfile(raw)
        if (!userId && mapped) mapped.isOwnProfile = true
        setProfile(mapped)
      } catch (err) {
        if (cancelled) return
        debugError('[Community] social profile failed', err?.message)
        setError(err)
        setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, enabled])

  useEffect(() => {
    if (!enabled || userId) return undefined
    const onRefresh = () => {
      refresh()
    }
    window.addEventListener(COMMUNITY_PROFILE_REFRESH_EVENT, onRefresh)
    return () => {
      window.removeEventListener(COMMUNITY_PROFILE_REFRESH_EVENT, onRefresh)
    }
  }, [enabled, userId, refresh])

  return { profile, loading, error, refresh, setProfile }
}
