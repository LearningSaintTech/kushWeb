import { ROUTES } from '../../../utils/constants'
import { COMMUNITY_ROLES } from '../capabilities'
import { isCommunityProfileDeleted } from '../../../services/communityProfile.mappers.js'

function isIncompleteStep(step) {
  return Boolean(step && step !== 'completed' && step !== 'not_started')
}

function roleFromProfile(profile, fallbackRole) {
  if (profile?.isDesigner) return COMMUNITY_ROLES.DESIGNER
  if (profile?.isCreator) return COMMUNITY_ROLES.CREATOR
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
 * - Deleted / requires onboarding → create/join (re-onboard)
 * - Incomplete onboarding → profile (wizard resumes)
 * - Creator / designer → profile dashboard
 * - Normal user → feed home
 */
export function resolveCommunityDestination(profile, fallbackRole) {
  if (isCommunityProfileDeleted(profile)) {
    return ROUTES.COMMUNITY_CREATE_JOIN
  }

  if (
    profile?.isDesigner &&
    isIncompleteStep(profile.designerOnboardingStep)
  ) {
    return ROUTES.COMMUNITY_PROFILE
  }

  if (
    profile?.isCreator &&
    !profile?.isDesigner &&
    isIncompleteStep(profile.creatorOnboardingStep)
  ) {
    return ROUTES.COMMUNITY_PROFILE
  }

  const role = roleFromProfile(profile, fallbackRole)
  if (role === COMMUNITY_ROLES.DESIGNER || role === COMMUNITY_ROLES.CREATOR) {
    return ROUTES.COMMUNITY_PROFILE
  }

  return ROUTES.COMMUNITY_FEED
}
