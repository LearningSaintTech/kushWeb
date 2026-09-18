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

const profileCache = new Map()
const inflight = new Map()
const CACHE_TTL_MS = 20_000

function cacheKeyFor(userId) {
  return userId || 'me'
}

function readCache(key) {
  const entry = profileCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) return entry.data
  return entry.data
}

async function loadSocialProfile(userId, { force = false } = {}) {
  const key = cacheKeyFor(userId)
  if (!force) {
    const cached = profileCache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data
    }
    if (inflight.has(key)) return inflight.get(key)
  }

  const request = (userId
    ? communityService.getProfile(userId)
    : communityService.getMyProfile()
  )
    .then((raw) => {
      const mapped = mapSocialProfile(raw)
      if (!userId && mapped) mapped.isOwnProfile = true
      if (mapped) {
        profileCache.set(key, { data: mapped, at: Date.now() })
        debugLog('[Community] social profile ok', {
          userId: mapped?.id,
          own: mapped?.isOwnProfile,
          stats: mapped?.statsRaw,
          posts: mapped?.mediaByTab?.Posts?.length,
        })
      }
      return mapped
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

/**
 * @param {{ userId?: string|null, enabled?: boolean }} options
 * omit userId / null → own profile via /profile/me
 */
export function useCommunitySocialProfile(options = {}) {
  const { userId = null, enabled = true } = options
  const cacheKey = cacheKeyFor(userId)
  const cached = readCache(cacheKey)
  const [profile, setProfile] = useState(cached)
  const [loading, setLoading] = useState(Boolean(enabled && !cached))
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled) return null
    if (!readCache(cacheKey)) setLoading(true)
    setError(null)
    try {
      const mapped = await loadSocialProfile(userId, { force: true })
      setProfile(mapped)
      return mapped
    } catch (err) {
      debugError('[Community] social profile failed', err?.message)
      setError(err)
      if (!readCache(cacheKey)) setProfile(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, enabled, cacheKey])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }
    const currentCached = readCache(cacheKey)
    if (currentCached) {
      setProfile(currentCached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const mapped = await loadSocialProfile(userId)
        if (cancelled) return
        setProfile(mapped)
      } catch (err) {
        if (cancelled) return
        debugError('[Community] social profile failed', err?.message)
        setError(err)
        if (!readCache(cacheKey)) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, enabled, cacheKey])

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
