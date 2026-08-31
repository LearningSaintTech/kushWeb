import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import FeedFilters from '../components/FeedFilters'
import PostCard from '../components/PostCard'
import PostCardSkeleton from '../components/PostCardSkeleton'
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
  const sentinelRef = useRef(null)

  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        setHashtagsLoading(true)

        const response = await communityService.getHashtags()

        const hashtags =
          response?.data?.items ||
          response?.items ||
          []

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

  const activeHashtag =
    activeFilter !== 'All' &&
    activeFilter !== 'My F' &&
    activeFilter !== 'Creators' &&
    activeFilter !== 'Trending'
      ? activeFilter.replace(/^#/, '')
      : undefined

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
    hashtag: activeHashtag,
    enabled: activeFilter !== 'Notifications' && activeFilter !== 'Profile',
  })

  // Infinite scroll observer: trigger loadMore when sentinel approaches viewport
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
      { rootMargin: '400px 0px', threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMore])

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

  const handleFollow = useCallback(
    async (post) => {
      try {
        await toggleCommunityFollow(
          post?.author,
          (userId, patch) => {
            setItems((prev) =>
              prev.map((item) => {
                const itemAuthorId = item.author?.id || item.author?._id || item.authorId
                if (String(itemAuthorId) !== String(userId)) return item
                return {
                  ...item,
                  isFollowing: patch.isFollowing,
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
    },
    [setItems, social],
  )

  const handleProfileClick = useCallback(
    (author) => {
      openProfile?.(author)
    },
    [openProfile],
  )

  const handleOpenPost = useCallback(
    (post) => {
      openPost?.(post)
    },
    [openPost],
  )

  const handleLike = useCallback(
    (post) => {
      toggleCommunityLike(post, patchItem, social)
    },
    [patchItem, social],
  )

  const handleSave = useCallback(
    (post) => {
      toggleCommunitySave(post, patchItem, social)
    },
    [patchItem, social],
  )

  return (
    <div>
      <FeedFilters
        filters={feedFilters}
        active={activeFilter}
        onChange={setActiveFilter}
      />

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

      {/* Initial Loading Skeleton */}
      {loading ? (
        <div className="mt-6 space-y-8">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : null}

      {!loading && !error && posts.length === 0 ? (
        <p className="mt-8 font-inter text-sm text-neutral-500">
          No posts yet. Follow creators or switch to Discover.
        </p>
      ) : null}

      {!loading && posts.length > 0 ? (
        <div className="mt-6 space-y-8">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onProfileClick={() => handleProfileClick(post.author)}
              onOpenPost={() => handleOpenPost(post)}
              onFollow={() => handleFollow(post)}
              onLike={() => handleLike(post)}
              onSave={() => handleSave(post)}
            />
          ))}
        </div>
      ) : null}

      {/* Loading more skeleton cards for infinite scrolling */}
      {loadingMore ? (
        <div className="mt-8 space-y-8">
          <PostCardSkeleton />
        </div>
      ) : null}

      {/* Invisible sentinel element for infinite scrolling */}
      {hasMore && !loading ? (
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />
      ) : null}
    </div>
  )
}
