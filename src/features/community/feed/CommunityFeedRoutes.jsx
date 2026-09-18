import CommunityFeedLayout from '../layout/CommunityFeedLayout'

/** Distinct route components so React remounts the shell when the sidebar path changes. */
export function CommunityFeedHomeRoute() {
  return <CommunityFeedLayout />
}

export function CommunityFeedSearchRoute() {
  return <CommunityFeedLayout />
}

export function CommunityFeedReelsRoute() {
  return <CommunityFeedLayout />
}

export function CommunityFeedProfileRoute() {
  return <CommunityFeedLayout />
}

export function CommunityFeedCreateRoute() {
  return <CommunityFeedLayout />
}

export function CommunityFeedSavedRoute() {
  return <CommunityFeedLayout />
}
