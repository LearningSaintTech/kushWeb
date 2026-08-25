/**
 * Map community stats + profile/me into dashboard Likes / Views / Posts chips.
 * Priority matches Android DesignerDashboardScreen / CreatorDashboardScreen.
 */

function formatMetricCount(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(num)
}

function firstNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * @param {object|null} stats - GET /community/stats payload
 * @param {object|null} profile - GET /community/profile/me payload (raw or mapped)
 * @param {'creator'|'designer'} [mode]
 * @returns {{ chips: Array<{label:string,value:string}>, raw: object } | null}
 */
export function mapCommunityDashboardMetrics(stats, profile, mode = 'creator') {
  const counts = profile?.counts || {}
  const statsRaw = profile?.statsRaw || {}
  const contentLabel = mode === 'designer' ? 'Designs' : 'Posts & Reels'

  const likes = firstNumber(
    stats?.totalLikes,
    stats?.likes,
    counts.likes,
    profile?.likesCount,
    statsRaw.likes,
  )
  const views = firstNumber(
    stats?.totalViews,
    stats?.views,
    counts.views,
    profile?.viewsCount,
    statsRaw.views,
  )
  const posts = firstNumber(
    stats?.totalContent,
    stats?.totalPosts,
    stats?.totalDesigns,
    stats?.designs,
    stats?.posts,
    counts.posts,
    counts.designs,
    profile?.postsCount,
    statsRaw.posts,
  )

  if (likes == null && views == null && posts == null) return null

  return {
    chips: [
      { label: 'Likes', value: formatMetricCount(likes ?? 0) },
      { label: 'Views', value: formatMetricCount(views ?? 0) },
      { label: contentLabel, value: formatMetricCount(posts ?? 0) },
    ],
    raw: {
      likes: likes ?? 0,
      views: views ?? 0,
      posts: posts ?? 0,
    },
  }
}
