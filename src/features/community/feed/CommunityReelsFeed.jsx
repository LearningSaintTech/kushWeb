import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import ReelCard from '../components/reels/ReelCard'
import {
  useCommunityFeed,
  toggleCommunityLike,
  toggleCommunitySave,
  toggleCommunityFollow,
} from '../hooks/useCommunityFeed'
import { useCommunitySocial } from '../context/CommunitySocialContext'
import { communityService } from '../../../services/community.service.js'
import { mapContentToReel } from '../../../services/communityContent.mappers.js'
import { getCommunityReelsPath } from '../../../utils/constants'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'

/**
 * Fullscreen Shorts / Reels — one reel per viewport, snap scroll.
 * Deep link: /community/feed/reels?reelId=…
 * Profile open: location.state.playlist = that user's reels
 */
export default function CommunityReelsFeed() {
  const { openProfile, openReelComments } = useOutletContext() ?? {}
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const startReelId =
    searchParams.get('reelId') ||
    searchParams.get('reel') ||
    location.state?.startReelId ||
    ''

  const profilePlaylist = useMemo(() => {
    const list = Array.isArray(location.state?.playlist) ? location.state.playlist : []
    return list
      .filter((r) => r?.id)
      .map((r) => ({
        ...r,
        type: 'reel',
        video: r.video || r.videoUrl || '',
        videoUrl: r.videoUrl || r.video || '',
        poster: r.poster || r.image || '',
      }))
  }, [location.state])

  const profileSeed = location.state?.seed || null
  const useProfilePlaylist = profilePlaylist.length > 0 || Boolean(profileSeed?.id)

  const social = useCommunitySocial()
  const scrollerRef = useRef(null)
  const itemRefs = useRef([])
  const viewedRef = useRef(new Set())
  const scrolledToStartRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [bootReel, setBootReel] = useState(null)

  const {
    items: feedReels,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    patchItem,
    setItems,
  } = useCommunityFeed({
    scope: 'explore',
    type: 'reel',
    limit: 6,
    // Skip explore fetch when opening a profile playlist — show user's reels immediately
    enabled: !useProfilePlaylist,
  })

  // Seed from navigation state immediately (profile / saved)
  useEffect(() => {
    if (!useProfilePlaylist) return
    if (profileSeed?.id) {
      setBootReel({
        ...profileSeed,
        type: 'reel',
        video: profileSeed.video || profileSeed.videoUrl || '',
        videoUrl: profileSeed.videoUrl || profileSeed.video || '',
        poster: profileSeed.poster || profileSeed.image || '',
      })
    }
  }, [useProfilePlaylist, profileSeed])

  // Hydrate video URL if playlist seed only has a poster/thumbnail
  useEffect(() => {
    if (!useProfilePlaylist || !startReelId) return undefined
    const existing =
      profilePlaylist.find((r) => String(r.id) === String(startReelId)) ||
      (profileSeed && String(profileSeed.id) === String(startReelId) ? profileSeed : null)
    const hasVideo = Boolean(existing?.video || existing?.videoUrl)
    if (hasVideo) return undefined

    let cancelled = false
    communityService
      .getContent(startReelId)
      .then((raw) => {
        if (cancelled) return
        const mapped = mapContentToReel(raw?.content || raw?.item || raw)
        if (!mapped) return
        setBootReel(mapped)
      })
      .catch((err) => {
        debugError('[Community] profile reel hydrate failed', err?.message)
      })

    return () => {
      cancelled = true
    }
  }, [useProfilePlaylist, startReelId, profilePlaylist, profileSeed])

  // Fetch missing deep-linked reel only for explore mode
  useEffect(() => {
    if (useProfilePlaylist || !startReelId) {
      if (!useProfilePlaylist && !startReelId) setBootReel(null)
      return undefined
    }
    if (feedReels.some((r) => String(r.id) === String(startReelId))) {
      setBootReel(null)
      return undefined
    }

    let cancelled = false
    communityService
      .getContent(startReelId)
      .then((raw) => {
        if (cancelled) return
        const mapped = mapContentToReel(raw?.content || raw?.item || raw)
        if (mapped) setBootReel(mapped)
      })
      .catch((err) => {
        debugError('[Community] start reel fetch failed', err?.message)
      })

    return () => {
      cancelled = true
    }
  }, [startReelId, feedReels, useProfilePlaylist])

  const reels = useMemo(() => {
    if (useProfilePlaylist) {
      const byId = new Map()
      for (const r of profilePlaylist) byId.set(String(r.id), r)
      if (bootReel?.id) {
        const prev = byId.get(String(bootReel.id))
        byId.set(String(bootReel.id), prev ? { ...prev, ...bootReel } : bootReel)
      }
      let list = Array.from(byId.values())
      if (startReelId) {
        const idx = list.findIndex((r) => String(r.id) === String(startReelId))
        if (idx > 0) {
          const [hit] = list.splice(idx, 1)
          list.unshift(hit)
        }
      }
      return list
    }

    if (!bootReel) return feedReels
    if (feedReels.some((r) => String(r.id) === String(bootReel.id))) return feedReels
    return [bootReel, ...feedReels]
  }, [useProfilePlaylist, profilePlaylist, bootReel, feedReels, startReelId])

  // Scroll / activate start reel once
  useEffect(() => {
    if (!reels.length) return
    const targetId = startReelId || reels[0]?.id
    if (!targetId) return
    if (scrolledToStartRef.current === `${targetId}:${reels.length}`) return

    const index = reels.findIndex((r) => String(r.id) === String(targetId))
    const nextIndex = index >= 0 ? index : 0
    scrolledToStartRef.current = `${targetId}:${reels.length}`
    setActiveIndex(nextIndex)
    requestAnimationFrame(() => {
      itemRefs.current[nextIndex]?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }, [startReelId, reels])

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean)
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        let best = null
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.intersectionRatio < 0.4) continue
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry
          }
        }
        if (!best) return
        const index = Number(best.target.getAttribute('data-reel-index'))
        if (!Number.isNaN(index)) setActiveIndex(index)
      },
      {
        root: scrollerRef.current,
        threshold: [0.45, 0.6, 0.75],
      },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [reels.length])

  useEffect(() => {
    if (useProfilePlaylist || !hasMore) return
    if (activeIndex >= Math.max(0, reels.length - 3)) {
      loadMore()
    }
  }, [activeIndex, hasMore, loadMore, reels.length, useProfilePlaylist])

  useEffect(() => {
    const reel = reels[activeIndex]
    if (!reel?.id || viewedRef.current.has(reel.id)) return undefined
    const t = setTimeout(() => {
      viewedRef.current.add(reel.id)
      communityService.recordView(reel.id).catch((err) => {
        debugError('[Community] recordView failed', err?.message)
      })
    }, 1500)
    return () => clearTimeout(t)
  }, [activeIndex, reels])

  useEffect(() => {
    const onBlocked = (e) => {
      const userId = e?.detail?.userId
      if (!userId) return
      setBootReel((prev) =>
        prev && String(prev.author?.id) === String(userId) ? null : prev,
      )
      setItems((prev) =>
        prev.filter((item) => String(item.author?.id) !== String(userId)),
      )
    }
    window.addEventListener('khush:community-user-blocked', onBlocked)
    return () => window.removeEventListener('khush:community-user-blocked', onBlocked)
  }, [setItems])

  const patchLocal = useCallback((id, patch) => {
    setBootReel((prev) => (prev && String(prev.id) === String(id) ? { ...prev, ...patch } : prev))
    setItems((prev) =>
      prev.map((item) => (String(item.id) === String(id) ? { ...item, ...patch } : item)),
    )
  }, [setItems])

  const patchByAuthorId = useCallback(
    (userId, patch) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.author?.id !== userId) return item
          return {
            ...item,
            isFollowing: patch.isFollowing ?? item.isFollowing,
            author: { ...item.author, ...patch },
          }
        }),
      )
      setBootReel((prev) => {
        if (!prev || prev.author?.id !== userId) return prev
        return {
          ...prev,
          isFollowing: patch.isFollowing ?? prev.isFollowing,
          author: { ...prev.author, ...patch },
        }
      })
    },
    [setItems],
  )

  const handleLike = useCallback(
    async (reel) => {
      try {
        await toggleCommunityLike(reel, (id, patch) => {
          patchItem(id, patch)
          patchLocal(id, patch)
        }, social)
      } catch (err) {
        debugError('[Community] reel like failed', err?.message)
      }
    },
    [patchItem, patchLocal, social],
  )

  const handleSave = useCallback(
    async (reel) => {
      try {
        await toggleCommunitySave(reel, (id, patch) => {
          patchItem(id, patch)
          patchLocal(id, patch)
        }, social)
      } catch (err) {
        debugError('[Community] reel save failed', err?.message)
      }
    },
    [patchItem, patchLocal, social],
  )

  const handleFollow = useCallback(
    async (reel) => {
      try {
        await toggleCommunityFollow(
          { ...reel.author, isFollowing: reel.isFollowing },
          patchByAuthorId,
          social,
        )
      } catch (err) {
        debugError('[Community] reel follow failed', err?.message)
      }
    },
    [patchByAuthorId, social],
  )

  const handleShare = useCallback(async (reel) => {
    const url = `${window.location.origin}${getCommunityReelsPath(reel.id)}`
    logCommunity('ReelsFeed share', { id: reel.id, url })
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.caption || 'Khush Reel', url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        debugLog('[Community] reel link copied', url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        debugError('[Community] reel share failed', err?.message)
      }
    }
  }, [])

  const handleComment = useCallback(
    (reel) => {
      openReelComments?.(reel)
    },
    [openReelComments],
  )

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(reels.length - 1, index))
      itemRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveIndex(clamped)
    },
    [reels.length],
  )

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        goTo(activeIndex + 1)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, goTo])

  const showLoading = !useProfilePlaylist && loading && reels.length === 0
  const showError = !useProfilePlaylist && error && reels.length === 0

  if (showLoading) {
    return (
      <div className="flex h-full items-center justify-center font-inter text-sm text-neutral-400">
        Loading reels…
      </div>
    )
  }

  if (showError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 font-inter text-sm text-amber-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="cursor-pointer rounded-full bg-white/10 px-4 py-2 font-semibold text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!reels.length) {
    return (
      <div className="flex h-full items-center justify-center font-inter text-sm text-neutral-400">
        No reels yet
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-black">
      <div
        ref={scrollerRef}
        className="scrollbar-hide h-full min-h-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        aria-label="Community reels"
      >
        {reels.map((reel, index) => {
          const dist = Math.abs(index - activeIndex)
          if (dist > 2) {
            return (
              <section
                key={reel.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                data-reel-index={index}
                className="box-border h-full min-h-full max-h-full snap-start snap-always bg-black"
                aria-hidden
              />
            )
          }

          return (
            <section
              key={reel.id}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              data-reel-index={index}
              className="box-border flex h-full min-h-full max-h-full snap-start snap-always flex-col overflow-hidden"
              aria-label={`Reel ${index + 1} of ${reels.length}`}
            >
              <ReelCard
                reel={reel}
                active={index === activeIndex}
                warm={dist === 1}
                onProfileClick={openProfile}
                onLike={() => handleLike(reel)}
                onSave={() => handleSave(reel)}
                onShare={() => handleShare(reel)}
                onComment={() => handleComment(reel)}
                onFollow={() => handleFollow(reel)}
              />
            </section>
          )
        })}
      </div>
    </div>
  )
}
