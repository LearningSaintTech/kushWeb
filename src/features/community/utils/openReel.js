import { getCommunityReelsPath } from '../../../utils/constants'

/**
 * Build a reels playlist from profile grid tiles (mediaByTab.Reels).
 */
export function playlistFromGrid(items = []) {
  return items
    .map((item) => {
      const reel = item?.post || item
      if (!reel?.id) return null
      return {
        ...reel,
        type: 'reel',
        video: reel.video || reel.videoUrl || '',
        videoUrl: reel.videoUrl || reel.video || '',
        poster: reel.poster || reel.image || '',
      }
    })
    .filter(Boolean)
}

/**
 * Open fullscreen reels starting at a profile/saved reel.
 * Passes playlist in location.state so the feed shows those reels (not explore).
 */
export function navigateToReel(navigate, { reelId, seed, playlist = [], source = 'profile' } = {}) {
  const id = reelId || seed?.id
  if (!id || !navigate) return

  const list = Array.isArray(playlist) && playlist.length ? playlist : seed ? [seed] : []
  const hasSeed = list.some((r) => String(r.id) === String(id))
  const nextPlaylist = hasSeed ? list : seed ? [seed, ...list] : list

  navigate(getCommunityReelsPath(id), {
    state: {
      source,
      startReelId: String(id),
      seed: seed || nextPlaylist.find((r) => String(r.id) === String(id)) || null,
      playlist: nextPlaylist,
    },
  })
}

export function isReelGridItem(item, tab) {
  if (!item) return false
  if (tab === 'Reels' || tab === 'reel') return true
  return item.type === 'reel' || item.post?.type === 'reel'
}
