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

function asList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  return []
}

function sumField(list, key) {
  return asList(list).reduce((total, row) => total + (Number(row?.[key]) || 0), 0)
}

function unwrapMetricsPayload(payload) {
  if (!payload || typeof payload !== 'object') return {}
  const nested =
    payload.stats && typeof payload.stats === 'object'
      ? payload.stats
      : payload.metrics && typeof payload.metrics === 'object'
        ? payload.metrics
        : payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : null
  return nested ? { ...payload, ...nested } : payload
}

function viewsFromRoleBucket(stats, mode) {
  const bucket = stats?.byRole?.[mode] || stats?.byRole?.[String(mode || '').toUpperCase()]
  if (!bucket || typeof bucket !== 'object') return null
  return firstNumber(
    bucket.totalViews,
    bucket.views,
    bucket.viewCount,
    bucket.viewsCount,
    bucket.postViews,
  )
}

/**
 * @param {object|null} stats - GET /community/stats payload
 * @param {object|null} profile - GET /community/profile/me payload (raw or mapped)
 * @param {'creator'|'designer'} [mode]
 * @returns {{ chips: Array<{label:string,value:string}>, raw: object } | null}
 */
export function mapCommunityDashboardMetrics(stats, profile, mode = 'creator') {
  const statsObj = unwrapMetricsPayload(stats)
  const profileObj = unwrapMetricsPayload(profile)
  const counts = profileObj?.counts || profileObj?.statsRaw || {}
  const statsRaw = profileObj?.statsRaw || {}
  const contentLabel = mode === 'designer' ? 'Designs' : 'Posts'

  const profilePosts = asList(profileObj.posts).length
    ? asList(profileObj.posts)
    : asList(profileObj.raw?.posts)
  const profileReels = asList(profileObj.reels).length
    ? asList(profileObj.reels)
    : asList(profileObj.raw?.reels)
  const summedLikes =
    sumField(profilePosts, 'likeCount') + sumField(profileReels, 'likeCount')
  const summedViews =
    sumField(profilePosts, 'viewCount') + sumField(profileReels, 'viewCount')
  const likes = firstNumber(
    profilePosts.length + profileReels.length > 0 ? summedLikes : null,
    counts.likes,
    counts.likeCount,
    statsRaw.likes,
    profileObj.likesCount,
    profileObj.totalLikes,
    statsObj.totalLikes,
    statsObj.likes,
    statsObj.likeCount,
    statsObj.likesCount,
    viewsFromRoleBucket(statsObj, mode) != null
      ? statsObj.byRole?.[mode]?.totalLikes || statsObj.byRole?.[mode]?.likes
      : null,
  )
  const views = firstNumber(
    profilePosts.length + profileReels.length > 0 ? summedViews : null,
    counts.views,
    counts.viewCount,
    counts.totalViews,
    statsRaw.views,
    profileObj.viewsCount,
    profileObj.totalViews,
    profileObj.viewCount,
    profileObj.views,
    statsObj.totalViews,
    statsObj.views,
    statsObj.viewCount,
    statsObj.viewsCount,
    statsObj.postViews,
    statsObj.contentViews,
    viewsFromRoleBucket(statsObj, mode),
  )
  const posts = firstNumber(
    counts.posts,
    counts.content,
    counts.designs,
    counts.totalPosts,
    profilePosts.length || null,
    statsRaw.posts,
    profileObj.postsCount,
    profileObj.totalPosts,
    statsObj.totalPosts,
    statsObj.totalDesigns,
    statsObj.designs,
    statsObj.posts,
    statsObj.contentCount,
    statsObj.totalContent,
  )

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
