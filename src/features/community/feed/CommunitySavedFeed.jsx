import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useCommunitySaves } from '../hooks/useCommunityFeed'
import { logCommunity } from '../../../services/communityApi.js'
import { navigateToReel } from '../utils/openReel'
import { GridCardSkeleton } from '../components/PostCardSkeleton'

const TABS = [
  { id: 'post', label: 'Images' },
  { id: 'reel', label: 'Reels' },
]

/**
 * Saved / Favourites — GET /community/saves?type=post|reel
 */
export default function CommunitySavedFeed() {
  const [tab, setTab] = useState('post')
  const navigate = useNavigate()
  const { openPost } = useOutletContext() ?? {}
  const sentinelRef = useRef(null)

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useCommunitySaves({ type: tab })

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loadingMore || loading) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '300px 0px', threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

  const handleOpen = (item) => {
    logCommunity('SavedFeed open', { id: item.id, type: item.type })
    if (item.type === 'reel') {
      const playlist = items
        .filter((row) => row.type === 'reel')
        .map((row) => ({ ...row, type: 'reel' }))
      navigateToReel(navigate, {
        reelId: item.id,
        seed: { ...item, type: 'reel' },
        playlist,
        source: 'saved',
      })
      return
    }
    openPost?.(item)
  }

  return (
    <div className="pb-8">
      <h1 className="font-inter text-3xl font-bold tracking-tight text-black sm:text-[2rem]">
        Your Favourites
      </h1>

      <div className="mt-5 flex gap-2">
        {TABS.map((item) => {
          const active = item.id === tab
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`cursor-pointer rounded-full px-4 py-2 font-inter text-sm font-semibold transition ${
                active
                  ? 'bg-[#1b261e] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl bg-amber-50 px-4 py-3 font-inter text-sm text-amber-900">
          {error}
          <button
            type="button"
            onClick={refresh}
            className="ml-3 cursor-pointer font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Initial Grid Skeletons */}
      {loading ? (
        <div className="mt-6 grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 12 }).map((_, idx) => (
            <GridCardSkeleton key={`skeleton-${idx}`} />
          ))}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="mt-8 font-inter text-sm text-neutral-500">No saved items yet</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {items.map((item) => {
            const thumb = item.image || item.poster || item.videoUrl
            const isReel = item.type === 'reel'
            return (
              <button
                key={item.saveId || item.id || item._id}
                type="button"
                onClick={() => handleOpen(item)}
                className="relative aspect-square w-full cursor-pointer overflow-hidden bg-neutral-100 transition hover:opacity-90"
                aria-label={`Open saved ${item.type}`}
              >
                {thumb ? (
                  isReel && !item.image && !item.poster ? (
                    <video
                      src={thumb}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-inter text-xs text-neutral-400">
                    {isReel ? 'Reel' : 'Post'}
                  </span>
                )}
                {isReel ? (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-wide text-white">
                    Reel
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Loading More Grid Skeletons */}
      {loadingMore ? (
        <div className="mt-1 grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 6 }).map((_, idx) => (
            <GridCardSkeleton key={`more-skeleton-${idx}`} />
          ))}
        </div>
      ) : null}

      {/* Invisible sentinel element for infinite scrolling */}
      {hasMore && !loading ? (
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />
      ) : null}
    </div>
  )
}
