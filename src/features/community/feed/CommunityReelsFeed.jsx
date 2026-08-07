import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReelCard from '../components/reels/ReelCard'
import {
  useCommunityFeed,
  toggleCommunityLike,
  toggleCommunitySave,
  toggleCommunityFollow,
} from '../hooks/useCommunityFeed'
import { useCommunitySocial } from '../context/CommunitySocialContext'
import { communityService } from '../../../services/community.service.js'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'

export default function CommunityReelsFeed() {
  const { openProfile, openPost } = useOutletContext() ?? {}
  const social = useCommunitySocial()
  const scrollerRef = useRef(null)
  const itemRefs = useRef([])
  const viewedRef = useRef(new Set())
  const [activeIndex, setActiveIndex] = useState(0)

  const {
    items: reels,
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
    limit: 8,
  })

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean)
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        let best = null
        for (const entry of entries) {
          if (!entry.intersectionRatio) continue
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
        threshold: [0.35, 0.5, 0.65],
      },
    )

    nodes.forEach((node) => observer.observe(node))
    setActiveIndex(0)

    return () => observer.disconnect()
  }, [reels.length])

  useEffect(() => {
    if (!hasMore) return
    if (activeIndex >= Math.max(0, reels.length - 3)) {
      logCommunity('ReelsFeed prefetch loadMore', { activeIndex, len: reels.length })
      loadMore()
    }
  }, [activeIndex, hasMore, loadMore, reels.length])

  useEffect(() => {
    const reel = reels[activeIndex]
    if (!reel?.id || viewedRef.current.has(reel.id)) return undefined
    const t = setTimeout(() => {
      viewedRef.current.add(reel.id)
      logCommunity('ReelsFeed recordView', { id: reel.id })
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
    const url = `${window.location.origin}${window.location.pathname}?reel=${reel.id}`
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
      logCommunity('ReelsFeed open comments', { id: reel.id })
      openPost?.(reel)
    },
    [openPost],
  )

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(reels.length - 1, index))
      const node = itemRefs.current[clamped]
      if (!node) return
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      <div className="flex h-full items-center justify-center font-inter text-sm text-neutral-500">
        Loading reels…
      </div>
    )
  }

  if (error && reels.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 font-inter text-sm text-amber-800">
        <p>{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="cursor-pointer rounded-full bg-neutral-100 px-4 py-2 font-semibold text-black"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-inter text-sm text-neutral-500">
        No reels yet
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div
        ref={scrollerRef}
        className="scrollbar-hide h-full min-h-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        aria-label="Community reels"
      >
        {reels.map((reel, index) => (
          <section
            key={reel.id}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            data-reel-index={index}
            className="flex min-h-full snap-start snap-always flex-col items-center justify-center py-2 sm:py-3 md:py-4 xl:py-5"
            aria-label={`Reel ${index + 1} of ${reels.length}`}
          >
            <ReelCard
              reel={reel}
              active={index === activeIndex}
              onProfileClick={openProfile}
              onLike={() => handleLike(reel)}
              onSave={() => handleSave(reel)}
              onShare={() => handleShare(reel)}
              onComment={() => handleComment(reel)}
              onFollow={() => handleFollow(reel)}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
