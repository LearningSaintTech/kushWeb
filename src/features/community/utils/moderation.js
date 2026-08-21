/** Shared community moderation events + helpers */

export const COMMUNITY_USER_BLOCKED_EVENT = 'khush:community-user-blocked'
export const COMMUNITY_USER_UNBLOCKED_EVENT = 'khush:community-user-unblocked'
export const COMMUNITY_CONTENT_REPORTED_EVENT = 'khush:community-content-reported'

export function dispatchUserBlocked({ userId, contentId, commentId } = {}) {
  if (typeof window === 'undefined' || !userId) return
  window.dispatchEvent(
    new CustomEvent(COMMUNITY_USER_BLOCKED_EVENT, {
      detail: { userId: String(userId), contentId, commentId },
    }),
  )
}

export function dispatchUserUnblocked({ userId, contentId, commentId } = {}) {
  if (typeof window === 'undefined' || !userId) return
  window.dispatchEvent(
    new CustomEvent(COMMUNITY_USER_UNBLOCKED_EVENT, {
      detail: { userId: String(userId), contentId, commentId },
    }),
  )
}

export function dispatchContentReported({ contentId, commentId, userId } = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(COMMUNITY_CONTENT_REPORTED_EVENT, {
      detail: { contentId, commentId, userId },
    }),
  )
}

/** Resolve canBlock when API omits flag (not own content). */
export function resolveCanBlock(flags, isOwn = false) {
  if (isOwn) return false
  const src = flags && typeof flags === 'object' ? flags : {}
  if (typeof src.canBlock === 'boolean') return src.canBlock
  return true
}

export function resolveCanReport(flags, isOwn = false) {
  if (isOwn) return false
  const src = flags && typeof flags === 'object' ? flags : {}
  if (typeof src.canReport === 'boolean') return src.canReport
  return true
}
