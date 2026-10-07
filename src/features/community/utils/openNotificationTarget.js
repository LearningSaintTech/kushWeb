import { ROUTES, getCommunityReelsPath } from '../../../utils/constants'
import { setCommunityNav } from './communityNav'
import { navigateToReel } from './openReel'
import { communityService } from '../../../services/community.service.js'
import {
  mapContentToPost,
  mapContentToReel,
} from '../../../services/communityContent.mappers.js'

function firstString(...values) {
  for (const value of values) {
    if (value == null || value === '') continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

export function parseNotificationMetadata(item) {
  let meta = item?.metadata
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta)
    } catch {
      meta = {}
    }
  }
  return meta && typeof meta === 'object' ? meta : {}
}

export function resolveCommunityNotificationTarget(item) {
  const meta = parseNotificationMetadata(item)
  const templateKey = String(item?.templateKey || meta.templateKey || '').toUpperCase()
  const hay = `${templateKey} ${item?.title || ''} ${item?.body || ''} ${JSON.stringify(meta)}`.toLowerCase()

  const scope = firstString(
    meta.scope,
    item.scope,
    meta.navigationScope,
    meta.navScope,
    meta.contentType,
    meta.content_type,
    item.contentType,
    meta.type,
    meta.targetType,
    meta.entityType,
    item.entityType,
  ).toLowerCase()

  const contentId = firstString(
    meta.contentId,
    meta.content_id,
    meta.reelId,
    meta.postId,
    item.referenceId,
    meta.referenceId,
    item.reference_id,
  )

  const userId = firstString(
    meta.userId,
    meta.actorId,
    meta.profileId,
    meta.followerId,
    meta.fromUserId,
    item.actorId,
  )

  const path = firstString(
    meta.path,
    meta.url,
    meta.deepLink,
    meta.link,
    item.actionUrl,
    item.link,
  )

  let kind = ''
  if (/reel|video|short/.test(scope) || /\breel\b/.test(hay)) kind = 'reel'
  else if (/post|image|photo|carousel/.test(scope)) kind = 'post'
  else if (/profile|user|follow|creator|designer/.test(scope) || templateKey.includes('FOLLOW')) {
    kind = 'profile'
  } else if (/project/.test(scope) || templateKey.includes('PROJECT') || templateKey.includes('DESIGNER_APPROVED')) {
    kind = 'profile'
  } else if (
    templateKey.includes('LIKED') ||
    templateKey.includes('COMMENTED') ||
    templateKey.includes('SAVED') ||
    templateKey.includes('CONTENT')
  ) {
    kind = 'content'
  }

  return {
    kind,
    scope,
    contentId,
    userId,
    path,
    templateKey,
    wantsComments: templateKey.includes('COMMENT'),
  }
}

function communityPathFromUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.startsWith('/community')) return value
  try {
    const url = new URL(value, window.location.origin)
    const next = `${url.pathname}${url.search}`
    return next.startsWith('/community') ? next : ''
  } catch {
    return ''
  }
}

function syncNavFromPath(path) {
  if (path.includes('/reels')) setCommunityNav('reels')
  else if (path.includes('/profile')) setCommunityNav('profile')
  else if (path.includes('/saved')) setCommunityNav('saved')
  else if (path.includes('/search')) setCommunityNav('search')
  else if (path.includes('/create')) setCommunityNav('create')
  else setCommunityNav('home')
}

/**
 * Open the screen a community notification points at (scope / contentType / ids).
 * Returns true when navigation happened.
 */
export async function openCommunityNotification({
  item,
  navigate,
  openPost,
  openProfile,
  onOpenReelComments,
} = {}) {
  if (!item || !navigate) return false
  const target = resolveCommunityNotificationTarget(item)

  // Moderation: removed content returns 404, tapping notification should not open content
  if (
    target.templateKey === 'COMMUNITY_CONTENT_REMOVED' ||
    String(item.templateKey || '').toUpperCase() === 'COMMUNITY_CONTENT_REMOVED'
  ) {
    return false
  }

  const path = communityPathFromUrl(target.path)
  if (path) {
    syncNavFromPath(path)
    navigate(path)
    return true
  }

  const openReel = (id, seed) =>
    navigateToReel(navigate, {
      reelId: id,
      seed: seed || { id, type: 'reel' },
      source: 'notification',
    })

  const openPostTarget = (payload) => {
    if (typeof openPost === 'function') {
      openPost(payload, { source: 'notification' })
      return true
    }
    const id = payload?.id || payload?._id
    if (!id) return false
    setCommunityNav('home')
    navigate(`${ROUTES.COMMUNITY_FEED}?postId=${encodeURIComponent(String(id))}`)
    return true
  }

  const openProfileTarget = (id) => {
    if (!id) {
      setCommunityNav('profile')
      navigate(ROUTES.COMMUNITY_PROFILE)
      return true
    }
    if (typeof openProfile === 'function') {
      openProfile({ id, userId: id })
      return true
    }
    setCommunityNav('home')
    navigate(`${ROUTES.COMMUNITY_FEED}?profileId=${encodeURIComponent(String(id))}`)
    return true
  }

  if (target.kind === 'reel' && target.contentId) {
    if (target.wantsComments && onOpenReelComments) {
      onOpenReelComments({ id: target.contentId, type: 'reel' })
      return true
    }
    return openReel(target.contentId)
  }

  if (target.kind === 'post' && target.contentId) {
    return openPostTarget({ id: target.contentId, type: 'post' })
  }

  if (target.kind === 'profile') {
    return openProfileTarget(target.userId || target.contentId)
  }

  if (target.contentId) {
    try {
      const raw = await communityService.getContent(target.contentId)
      const mapped = mapContentToPost(raw?.content || raw?.item || raw)
      const isReel = String(mapped?.type || '').toLowerCase() === 'reel'
      if (isReel) {
        const reel =
          mapContentToReel(raw?.content || raw?.item || raw) || {
            ...mapped,
            type: 'reel',
          }
        if (target.wantsComments && onOpenReelComments) {
          onOpenReelComments(reel)
          return true
        }
        return openReel(mapped.id, reel)
      }
      if (mapped) return openPostTarget(mapped)
    } catch {
      return openPostTarget({ id: target.contentId })
    }
  }

  if (target.userId) return openProfileTarget(target.userId)

  return false
}

export function notificationHasDestination(item) {
  const target = resolveCommunityNotificationTarget(item)
  return Boolean(target.contentId || target.userId || communityPathFromUrl(target.path) || target.scope)
}
