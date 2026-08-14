import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
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
 */
export default function CommunityReelsFeed() {
  const { openProfile, openReelComments } = useOutletContext() ?? {}
  const [searchParams] = useSearchParams()
  const startReelId = searchParams.get('reelId') || searchParams.get('reel') || ''
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
  })

  // Ensure deep-linked reel is present (prepend if missing)
  useEffect(() => {
    if (!startReelId) {
      setBootReel(null)
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
  }, [startReelId, feedReels])

  const reels = (() => {
    if (!bootReel) return feedReels
    if (feedReels.some((r) => String(r.id) === String(bootReel.id))) return feedReels
    return [bootReel, ...feedReels]
  })()

  // Scroll to deep-linked reel once
  useEffect(() => {
    if (!startReelId || scrolledToStartRef.current === startReelId || !reels.length) {
      return
    }
    const index = reels.findIndex((r) => String(r.id) === String(startReelId))
    if (index < 0) return
    scrolledToStartRef.current = startReelId
    setActiveIndex(index)
    requestAnimationFrame(() => {
      itemRefs.current[index]?.scrollIntoView({ behavior: 'auto', block: 'start' })
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
    if (!hasMore) return
    if (activeIndex >= Math.max(0, reels.length - 3)) {
      loadMore()
    }
  }, [activeIndex, hasMore, loadMore, reels.length])

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
        await toggleCommunityLike(reel, patchItem, social)
      } catch (err) {
        debugError('[Community] reel like failed', err?.message)
      }
    },
    [patchItem, social],
  )

  const handleSave = useCallback(
    async (reel) => {
      try {
        await toggleCommunitySave(reel, patchItem, social)
      } catch (err) {
        debugError('[Community] reel save failed', err?.message)
      }
    },
    [patchItem, social],
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

  if (loading && reels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-inter text-sm text-neutral-400">
        Loading reels…
      </div>
    )
  }

  if (error && reels.length === 0) {
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

  if (!loading && reels.length === 0) {
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
          // Only mount heavy players for active + neighbors (production perf)
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
