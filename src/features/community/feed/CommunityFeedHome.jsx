import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import FeedFilters from '../components/FeedFilters'
import PostCard from '../components/PostCard'
// import { FEED_FILTERS } from '../data/mockFeed'
import { communityService } from '../../../services/community.service.js'
import {
  useCommunityFeed,
  toggleCommunityLike,
  toggleCommunitySave,
  toggleCommunityFollow,
} from '../hooks/useCommunityFeed'
import { useCommunitySocial } from '../context/CommunitySocialContext'
import { debugError } from '../../../utils/debugLog.js'

/**
 * Home feed — following / explore via communityService.getFeed
 */
export default function CommunityFeedHome() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [feedFilters, setFeedFilters] = useState([])
const [hashtagsLoading, setHashtagsLoading] = useState(true)
  const { openProfile, openPost } = useOutletContext() ?? {}
  const social = useCommunitySocial()
  useEffect(() => {
  const fetchHashtags = async () => {
    try {
      setHashtagsLoading(true)

      const response = await communityService.getHashtags()

      console.log('[Community] hashtags response:', response)

      const hashtags =
        response?.data?.items ||
        response?.items ||
        []

      console.log('[Community] hashtags:', hashtags)

      const filters = hashtags
        .filter((item) => item?.isActive)
        .sort(
          (a, b) =>
            (a?.sortOrder ?? 0) -
            (b?.sortOrder ?? 0),
        )
        .map(
          (item) =>
            item?.label ||
            item?.keyword ||
            item?.tag,
        )
        .filter(Boolean)

      console.log('[Community] filters:', filters)

      setFeedFilters([
        'All',
        ...filters,
      ])
    } catch (error) {
      debugError(
        '[Community] hashtags fetch failed',
        error?.message,
      )

      setFeedFilters(['All'])
    } finally {
      setHashtagsLoading(false)
    }
  }

  fetchHashtags()
}, [])

  const scope =
    activeFilter === 'My F' ? 'following' : 'explore'

  const {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    patchItem,
    refresh,
    setItems,
  } = useCommunityFeed({
    scope,
    type: 'post',
    enabled: activeFilter !== 'Notifications' && activeFilter !== 'Profile',
  })

  useEffect(() => {
    const onDeleted = (e) => {
      const id = e?.detail?.id
      if (!id) return
      setItems((prev) => prev.filter((p) => String(p.id) !== String(id)))
    }
    const onBlocked = (e) => {
      const userId = e?.detail?.userId
      if (!userId) return
      setItems((prev) =>
        prev.filter((p) => String(p.author?.id) !== String(userId)),
      )
      refresh?.()
    }
    const onReported = (e) => {
      const contentId = e?.detail?.contentId
      if (!contentId) return
      patchItem?.(contentId, { isReported: true })
    }
    window.addEventListener('khush:community-content-deleted', onDeleted)
    window.addEventListener('khush:community-user-blocked', onBlocked)
    window.addEventListener('khush:community-content-reported', onReported)
    return () => {
      window.removeEventListener('khush:community-content-deleted', onDeleted)
      window.removeEventListener('khush:community-user-blocked', onBlocked)
      window.removeEventListener('khush:community-content-reported', onReported)
    }
  }, [setItems, refresh, patchItem])

  const posts = useMemo(() => {
    if (activeFilter === 'Creators') {
      return items.filter((p) => p.author?.role === 'CREATOR')
    }
    if (activeFilter === 'Trending') {
      return [...items].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    }
    return items
  }, [activeFilter, items])

  const handleFollow = async (post) => {
    try {
      await toggleCommunityFollow(
        post?.author,
        (userId, patch) => {
          setItems((prev) =>
            prev.map((item) => {
              if (item.author?.id !== userId) return item
              return {
                ...item,
                author: { ...item.author, ...patch },
              }
            }),
          )
        },
        social,
      )
    } catch (err) {
      debugError('[Community] follow failed', err?.message)
    }
  }

  return (
    <div>
     <FeedFilters
  filters={feedFilters}
  active={activeFilter}
  onChange={setActiveFilter}
/>

      {loading ? (
        <p className="mt-8 font-inter text-sm text-neutral-500">Loading feed…</p>
      ) : null}

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

      {!loading && !error && posts.length === 0 ? (
        <p className="mt-8 font-inter text-sm text-neutral-500">
          No posts yet. Follow creators or switch to Discover.
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onProfileClick={() => openProfile?.(post.author)}
            onOpenPost={() => openPost?.(post)}
            onFollow={() => handleFollow(post)}
            onLike={() => toggleCommunityLike(post, patchItem, social)}
            onSave={() => toggleCommunitySave(post, patchItem, social)}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-full bg-neutral-100 px-5 py-2.5 font-inter text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
