import { useAuth } from '../../../app/context/AuthContext'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { COMMUNITY_ROLES } from '../capabilities'

/**
 * Resolve community role from community profile flags (isDesigner / isCreator).
 * Dev override: localStorage.setItem('khushCommunityRole', 'creator' | 'designer' | 'user')
 */
export function useCommunityRole() {
  const { user, isAuthenticated } = useAuth()
  const { profile } = useCommunityProfile()

  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('khushCommunityRole')
    if (override === 'creator' || override === 'designer' || override === 'user') {
      return override
    }
  }

  if (!isAuthenticated || !user) return COMMUNITY_ROLES.GUEST

  // Prefer community-profile flags (designer implies creator on backend)
  if (profile?.isDesigner) return COMMUNITY_ROLES.DESIGNER
  if (profile?.isCreator) return COMMUNITY_ROLES.CREATOR

  if (user.isDesigner || user.is_designer) return COMMUNITY_ROLES.DESIGNER
  if (user.isCreator || user.is_creator) return COMMUNITY_ROLES.CREATOR

  const raw = (
    user.communityRole ??
    user.community_role ??
    user.accountType ??
    ''
  )
    .toString()
    .toLowerCase()

  if (raw === 'creator' || raw === 'designer') return raw
  return COMMUNITY_ROLES.USER
}
