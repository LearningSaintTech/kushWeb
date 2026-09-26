import { ROUTES } from '../../../utils/constants'
import { COMMUNITY_ROLES } from '../capabilities'
import {
  isCommunityProfileDeleted,
  isDesignerOnboardingIncomplete,
  isCreatorOnboardingIncomplete,
  isDesignerRoleReady,
  isCreatorRoleReady,
} from '../../../services/communityProfile.mappers.js'

function roleFromProfile(profile, fallbackRole) {
  if (profile) {
    if (isDesignerRoleReady(profile)) return COMMUNITY_ROLES.DESIGNER
    if (isCreatorRoleReady(profile) && !isCommunityProfileDeleted(profile)) {
      return COMMUNITY_ROLES.CREATOR
    }
    return COMMUNITY_ROLES.USER
  }
  if (
    fallbackRole === COMMUNITY_ROLES.DESIGNER ||
    fallbackRole === COMMUNITY_ROLES.CREATOR
  ) {
    return fallbackRole
  }
  return COMMUNITY_ROLES.USER
}

/**
 * Pick the community destination from auth + community-profile flags.
 * - Soft-deleted community profile → create/join (re-onboard)
 * - Incomplete creator/designer onboarding → profile (wizard resumes)
 * - Ready creator / designer → profile dashboard
 * - Normal user (shopper) → explore feed (browse/search/reels; cannot post)
 */
export function resolveCommunityDestination(profile, fallbackRole) {
  if (isCommunityProfileDeleted(profile)) {
    return ROUTES.COMMUNITY_CREATE_JOIN
  }

  if (isDesignerOnboardingIncomplete(profile)) {
    return ROUTES.COMMUNITY_PROFILE
  }

  if (isCreatorOnboardingIncomplete(profile)) {
    return ROUTES.COMMUNITY_PROFILE
  }

  const role = roleFromProfile(profile, fallbackRole)
  if (role === COMMUNITY_ROLES.DESIGNER || role === COMMUNITY_ROLES.CREATOR) {
    return ROUTES.COMMUNITY_PROFILE
  }

  return ROUTES.COMMUNITY_FEED
}
