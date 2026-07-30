/** Community role capabilities — shared by user / creator / designer feeds. */
export const COMMUNITY_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  CREATOR: 'creator',
  DESIGNER: 'designer',
}

export const CAPABILITIES = {
  guest: {
    canPost: false,
    canSave: false,
    sidebar: ['home', 'search', 'reels'],
    showCreateCard: false,
  },
  user: {
    canPost: false,
    canSave: true,
    sidebar: ['home', 'search', 'reels', 'notifications', 'create', 'profile', 'saved'],
    showCreateCard: true,
  },
  creator: {
    canPost: true,
    canSave: true,
    sidebar: ['home', 'search', 'reels', 'notifications', 'create', 'profile', 'saved'],
    showCreateCard: true,
  },
  designer: {
    canPost: true,
    canSave: true,
    sidebar: ['home', 'search', 'reels', 'notifications', 'create', 'profile', 'saved'],
    showCreateCard: true,
  },
}

export function can(role, action) {
  return Boolean(CAPABILITIES[role]?.[action])
}

export function getCapabilities(role) {
  return CAPABILITIES[role] ?? CAPABILITIES.user
}
