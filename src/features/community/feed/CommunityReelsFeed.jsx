import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReelCard from '../components/reels/ReelCard'
import { useCommunityFeed } from '../hooks/useCommunityFeed'
import { communityService } from '../../../services/community.service.js'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError } from '../../../utils/debugLog.js'

export default function CommunityReelsFeed() {
  const { openProfile } = useOutletContext() ?? {}
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
          if (!entry.isIntersecting) continue
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

  // Prefetch next page near end
  useEffect(() => {
    if (!hasMore) return
    if (activeIndex >= Math.max(0, reels.length - 3)) {
      logCommunity('ReelsFeed prefetch loadMore', { activeIndex, len: reels.length })
      loadMore()
    }
  }, [activeIndex, hasMore, loadMore, reels.length])

  // Record view after ~1.5s on active reel
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
            className="flex min-h-full snap-start snap-always flex-col items-center justify-center py-6"
            aria-label={`Reel ${index + 1} of ${reels.length}`}
          >
            <ReelCard
              reel={reel}
              active={index === activeIndex}
              onProfileClick={openProfile}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
