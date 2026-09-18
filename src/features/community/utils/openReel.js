import { getCommunityReelsPath } from '../../../utils/constants'
import { setCommunityNav } from './communityNav'

function mediaArray(item) {
  if (!item || typeof item !== 'object') return []
  if (Array.isArray(item.media)) return item.media
  if (Array.isArray(item.raw?.media)) return item.raw.media
  if (Array.isArray(item.post?.media)) return item.post.media
  if (Array.isArray(item.post?.raw?.media)) return item.post.raw.media
  return []
}

export function extractReelVideo(item) {
  if (!item) return ''
  const direct = item.video || item.videoUrl || item.post?.video || item.post?.videoUrl || ''
  const looksImage = (url) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(String(url || ''))
  const fromMedia = mediaArray(item).find(
    (m) => m?.url && (m.kind === 'video' || String(m.mimeType || '').startsWith('video/')),
  )?.url
  if (direct && !looksImage(direct)) return direct
  return fromMedia || ''
}

export function extractReelPoster(item) {
  if (!item) return ''
  const fromMedia = mediaArray(item).find(
    (m) => m?.url && (m.kind === 'thumbnail' || m.kind === 'image'),
  )?.url
  return (
    item.poster ||
    item.image ||
    item.post?.poster ||
    item.post?.image ||
    fromMedia ||
    ''
  )
}

/**
 * Build a reels playlist from profile grid tiles (mediaByTab.Reels).
 */
export function playlistFromGrid(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const reel = item?.post || item
      const id = resolveMediaId(reel) || resolveMediaId(item)
      if (!id) return null
      const video = extractReelVideo(reel) || extractReelVideo(item)
      return {
        ...reel,
        id,
        type: 'reel',
        video,
        videoUrl: video,
        poster: extractReelPoster(reel) || extractReelPoster(item),
        media: mediaArray(reel).length ? mediaArray(reel) : mediaArray(item),
        raw: reel.raw || item.raw || reel,
      }
    })
    .filter(Boolean)
}

export function resolveMediaId(item) {
  if (!item) return null
  return (
    item.id ||
    item._id ||
    item.contentId ||
    item.post?.id ||
    item.post?._id ||
    item.raw?._id ||
    item.raw?.id ||
    null
  )
}

export function isReelGridItem(item, tab) {
  if (!item) return false
  const t = String(tab || '').toLowerCase()
  if (t === 'reels' || t === 'reel') return true
  const type = String(item.type || item.post?.type || item.contentType || '').toLowerCase()
  return type === 'reel' || type === 'video'
}

const REEL_NAV_KEY = 'khush_community_reel_nav'

export function persistReelNavState(payload) {
  try {
    sessionStorage.setItem(REEL_NAV_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readReelNavState() {
  try {
    const raw = sessionStorage.getItem(REEL_NAV_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Open fullscreen reels starting at a profile/saved reel.
 * Passes playlist in location.state so the feed shows those reels (not explore).
 */
export function navigateToReel(navigate, { reelId, seed, playlist = [], source = 'profile' } = {}) {
  const id = reelId || seed?.id || seed?._id
  if (!id || !navigate) return false

  const list = Array.isArray(playlist) && playlist.length ? playlist : seed ? [seed] : []
  const hasSeed = list.some((r) => String(r.id || r._id) === String(id))
  const nextPlaylist = hasSeed ? list : seed ? [seed, ...list] : list
  const payload = {
    source,
    startReelId: String(id),
    seed: seed || nextPlaylist.find((r) => String(r.id || r._id) === String(id)) || null,
    playlist: nextPlaylist,
  }
  persistReelNavState(payload)
  setCommunityNav('reels')
  navigate(getCommunityReelsPath(id), { state: payload })
  return true
}

/**
 * Open a profile / saved grid tile as a post modal or fullscreen reel.
 */
export function openCommunityMedia({
  item,
  tab,
  playlist,
  navigate,
  openPost,
  source = 'profile',
} = {}) {
  if (!item) return false
  const id = resolveMediaId(item)
  if (!id) return false

  const isReel = isReelGridItem(item, tab)
  const base = item.post ? { ...item.post } : { ...item }
  const video = extractReelVideo(base) || extractReelVideo(item)
  const seed = {
    ...base,
    id,
    _id: base._id || id,
    type: isReel ? 'reel' : base.type || item.type || 'post',
    image: base.image || item.image || '',
    images: base.images?.length ? base.images : item.image ? [item.image] : [],
    poster: extractReelPoster(base) || extractReelPoster(item),
    video,
    videoUrl: video,
    media: mediaArray(base).length ? mediaArray(base) : mediaArray(item),
    raw: base.raw || item.raw || base,
  }

  if (isReel) {
    return navigateToReel(navigate, {
      reelId: id,
      seed,
      playlist: playlist?.length ? playlist : playlistFromGrid([item]),
      source,
    })
  }

  if (typeof openPost === 'function') {
    openPost(seed, { source })
    return true
  }
  return false
}
