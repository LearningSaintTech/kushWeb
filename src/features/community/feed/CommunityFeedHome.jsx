import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import FeedFilters from '../components/FeedFilters'
import PostCard from '../components/PostCard'
import { FEED_FILTERS, MOCK_POSTS } from '../data/mockFeed'

/**
 * Shared home feed — reused for normal users, creators, and designers.
 * Role-specific chrome lives in CommunityFeedLayout / sidebar capabilities.
 */
export default function CommunityFeedHome() {
  const [activeFilter, setActiveFilter] = useState('All')
  const { openProfile, openPost } = useOutletContext()

  const posts = useMemo(() => {
    if (activeFilter === 'Creators') {
      return MOCK_POSTS.filter((p) => p.author.role === 'CREATOR')
    }
    if (activeFilter === 'Trending') {
      return [...MOCK_POSTS].sort((a, b) => Number.parseFloat(b.likes) - Number.parseFloat(a.likes))
    }
    return MOCK_POSTS
  }, [activeFilter])

  return (
    <div>
      <FeedFilters
        filters={FEED_FILTERS}
        active={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="mt-6 space-y-8">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onProfileClick={() => openProfile?.(post.author)}
            onOpenPost={() => openPost?.(post)}
          />
        ))}
      </div>
    </div>
  )
}
