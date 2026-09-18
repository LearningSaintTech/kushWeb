import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useCommunityFeedUi } from '../context/CommunityFeedUiContext'
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
import { extractReelPoster, extractReelVideo, readReelNavState } from '../utils/openReel'
import { shareCommunityContent } from '../utils/shareProfile'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import { useAuth } from '../../../app/context/AuthContext'
import { requestCommunityProfileRefresh } from '../hooks/useCommunitySocialProfile'

/**
 * Fullscreen Shorts / Reels — one reel per viewport, snap scroll.
 * Deep link: /community/feed/reels?reelId=…
 * Profile open: location.state.playlist = that user's reels
 */
export default function CommunityReelsFeed() {
  const { isAuthenticated } = useAuth()
  const { openProfile, openReelComments } = useCommunityFeedUi()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const storedNav = useMemo(() => readReelNavState(), [location.key, location.search])
  const startReelId =
    searchParams.get('reelId') ||
    searchParams.get('reel') ||
    location.state?.startReelId ||
    storedNav?.startReelId ||
    ''

  const profilePlaylist = useMemo(() => {
    const list = Array.isArray(location.state?.playlist)
      ? location.state.playlist
      : Array.isArray(storedNav?.playlist)
        ? storedNav.playlist
        : []
    return list
      .filter((r) => r?.id || r?._id)
      .map((r) => {
        const video = extractReelVideo(r)
        const id = r.id || r._id
        return {
          ...r,
          id,
          type: 'reel',
          video,
          videoUrl: video,
          poster: extractReelPoster(r),
        }
      })
  }, [location.state, storedNav])

  const profileSeed = location.state?.seed || storedNav?.seed || null
  const useProfilePlaylist = profilePlaylist.length > 0 || Boolean(profileSeed?.id || profileSeed?._id)

  const social = useCommunitySocial()
  const scrollerRef = useRef(null)
  const itemRefs = useRef([])
  const viewedRef = useRef(new Set())
  const scrolledToStartRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [bootReel, setBootReel] = useState(null)
  const [removedIds, setRemovedIds] = useState(() => new Set())

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
    enabled: isAuthenticated && !useProfilePlaylist,
  })

  // Seed from navigation state immediately (profile / saved)
  useEffect(() => {
    if (!useProfilePlaylist) return
    if (profileSeed?.id || profileSeed?._id) {
      const video = extractReelVideo(profileSeed)
      setBootReel({
        ...profileSeed,
        id: profileSeed.id || profileSeed._id,
        type: 'reel',
        video,
        videoUrl: video,
        poster: extractReelPoster(profileSeed),
      })
    }
  }, [useProfilePlaylist, profileSeed])

  // Always hydrate the opened reel so profile/saved/search thumbs become playable video
  useEffect(() => {
    if (!startReelId) return undefined
    const existing =
      profilePlaylist.find((r) => String(r.id) === String(startReelId)) ||
      (profileSeed && String(profileSeed.id || profileSeed._id) === String(startReelId)
        ? profileSeed
        : null)
    const hasVideo = Boolean(extractReelVideo(existing) || existing?.video || existing?.videoUrl)
    if (hasVideo && existing?.video && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(existing.video)) {
      return undefined
    }

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
        debugError('[Community] reel hydrate failed', err?.message)
      })

    return () => {
      cancelled = true
    }
  }, [startReelId, profilePlaylist, profileSeed])

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
    const drop = (list) =>
      list.filter((r) => r?.id && !removedIds.has(String(r.id)))

    if (useProfilePlaylist) {
      const byId = new Map()
      for (const r of profilePlaylist) byId.set(String(r.id), r)
      if (bootReel?.id) {
        const prev = byId.get(String(bootReel.id))
        byId.set(String(bootReel.id), prev ? { ...prev, ...bootReel } : bootReel)
      }
      let list = drop(Array.from(byId.values()))
      if (startReelId) {
        const idx = list.findIndex((r) => String(r.id) === String(startReelId))
        if (idx > 0) {
          const [hit] = list.splice(idx, 1)
          list.unshift(hit)
        }
      }
      return list
    }

    const feed = drop(feedReels)
    if (!bootReel || removedIds.has(String(bootReel.id))) return feed
    if (feed.some((r) => String(r.id) === String(bootReel.id))) return feed
    return [bootReel, ...feed]
  }, [useProfilePlaylist, profilePlaylist, bootReel, feedReels, startReelId, removedIds])

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
    const onDeleted = (e) => {
      const id = e?.detail?.id
      if (!id) return
      setBootReel((prev) => (prev && String(prev.id) === String(id) ? null : prev))
      setRemovedIds((prev) => {
        const next = new Set(prev)
        next.add(String(id))
        return next
      })
      setItems((prev) => prev.filter((item) => String(item.id) !== String(id)))
    }
    window.addEventListener('khush:community-content-deleted', onDeleted)
    return () => {
      window.removeEventListener('khush:community-user-blocked', onBlocked)
      window.removeEventListener('khush:community-content-deleted', onDeleted)
    }
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

  const [shareHint, setShareHint] = useState('')

  const handleShare = useCallback(async (reel) => {
    try {
      const res = await shareCommunityContent({ ...reel, type: 'reel' })
      if (res?.method === 'clipboard' && res.success) {
        setShareHint(reel?.id || reel?._id || 'copied')
        window.setTimeout(() => {
          setShareHint((prev) => (prev === (reel?.id || reel?._id || 'copied') ? '' : prev))
        }, 2000)
      } else if (res?.method !== 'aborted' && !res?.success) {
        debugError('[Community] reel share failed', res?.method)
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

  const handleDelete = useCallback(
    async (reel) => {
      const id = reel?.id || reel?._id
      if (!id) return
      try {
        await communityService.deleteContent(id)
        setRemovedIds((prev) => {
          const next = new Set(prev)
          next.add(String(id))
          return next
        })
        setBootReel((prev) => (prev && String(prev.id) === String(id) ? null : prev))
        setItems((prev) => prev.filter((item) => String(item.id) !== String(id)))
        window.dispatchEvent(
          new CustomEvent('khush:community-content-deleted', {
            detail: { id: String(id) },
          }),
        )
        requestCommunityProfileRefresh()
      } catch (err) {
        debugError('[Community] reel delete failed', err?.message)
        throw err
      }
    },
    [setItems],
  )

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(reels.length - 1, index))
      const scroller = scrollerRef.current
      const node = itemRefs.current[clamped]
      if (scroller && node) {
        scroller.scrollTo({ top: node.offsetTop, behavior: 'smooth' })
      }
      setActiveIndex(clamped)
    },
    [reels.length],
  )

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined
    let locked = false
    let acc = 0
    const onWheel = (event) => {
      event.preventDefault()
      if (locked) return
      acc += event.deltaY
      if (Math.abs(acc) < 48) return
      const dir = acc > 0 ? 1 : -1
      acc = 0
      locked = true
      goTo(activeIndex + dir)
      window.setTimeout(() => {
        locked = false
      }, 480)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [activeIndex, goTo])

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
        className="community-reels-scroll scrollbar-hide h-full min-h-0"
        aria-label="Community reels"
      >
        {reels.map((reel, index) => {
          const dist = Math.abs(index - activeIndex)
          if (dist > 3) {
            return (
              <section
                key={reel.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                data-reel-index={index}
                className="community-reels-slide box-border h-full min-h-full max-h-full w-full shrink-0 bg-black"
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
              className="community-reels-slide box-border flex h-full min-h-full max-h-full w-full shrink-0 flex-col items-center justify-center overflow-hidden"
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
                shareLabel={shareHint && String(shareHint) === String(reel.id || reel._id) ? 'Copied' : 'Share'}
                onComment={() => handleComment(reel)}
                onFollow={() => handleFollow(reel)}
                onDelete={handleDelete}
              />
            </section>
          )
        })}
      </div>
    </div>
  )
}
