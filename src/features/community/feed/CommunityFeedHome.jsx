import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import FeedFilters from '../components/FeedFilters'
import PostCard from '../components/PostCard'
import { FEED_FILTERS } from '../data/mockFeed'
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
  const { openProfile, openPost } = useOutletContext() ?? {}
  const social = useCommunitySocial()

  const scope =
    activeFilter === 'Discover' || activeFilter === 'Trending'
      ? 'explore'
      : 'following'

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
        filters={FEED_FILTERS}
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
