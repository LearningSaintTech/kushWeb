import { useAuth } from '../../../app/context/AuthContext'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { COMMUNITY_ROLES } from '../capabilities'
import {
  isCommunityProfileDeleted,
  isDesignerRoleReady,
  isCreatorRoleReady,
} from '../../../services/communityProfile.service'

/**
 * Resolve community role from the latest community profile.
 * Designer chrome (tabs/badge) only after designer onboarding is actually ready.
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

  if (profile) {
    if (isCommunityProfileDeleted(profile)) return COMMUNITY_ROLES.USER
    if (isDesignerRoleReady(profile)) return COMMUNITY_ROLES.DESIGNER
    if (isCreatorRoleReady(profile)) return COMMUNITY_ROLES.CREATOR
    return COMMUNITY_ROLES.USER
  }

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
