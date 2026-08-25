import { useEffect, useRef, useState } from 'react'
import { useCommunityRole } from '../hooks/useCommunityRole'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { can, COMMUNITY_ROLES } from '../capabilities'
import CommunityProfileJoin from './CommunityProfileJoin'
import CommunityCreatorProfile from './CommunityCreatorProfile'
import CommunityDesignerProfile from './CommunityDesignerProfile'
import CreatorWizard from '../creator/CreatorWizard'
import RegistrationWizard from '../registration/RegistrationWizard'
import { isCommunityProfileDeleted } from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'

/**
 * Profile entry — joins for normal users; creator / designer dashboards by role.
 * Incomplete onboarding resumes the matching wizard once per visit.
 */
export default function CommunityProfilePage() {
  const role = useCommunityRole()
  const { profile } = useCommunityProfile()
  const [resumeCreator, setResumeCreator] = useState(false)
  const [resumeDesigner, setResumeDesigner] = useState(false)
  const autoResumeDoneRef = useRef(false)
  const profileDeleted = isCommunityProfileDeleted(profile)

  useEffect(() => {
    if (!profile || autoResumeDoneRef.current || profileDeleted) return

    const designerIncomplete =
      profile.isDesigner &&
      profile.designerOnboardingStep &&
      profile.designerOnboardingStep !== 'completed' &&
      profile.designerOnboardingStep !== 'not_started'

    const creatorIncomplete =
      profile.isCreator &&
      !profile.isDesigner &&
      profile.creatorOnboardingStep &&
      profile.creatorOnboardingStep !== 'completed' &&
      profile.creatorOnboardingStep !== 'not_started'

    if (designerIncomplete) {
      debugLog('[CommunityProfile] resume designer onboarding', {
        step: profile.designerOnboardingStep,
      })
      autoResumeDoneRef.current = true
      setResumeDesigner(true)
      return
    }

    if (creatorIncomplete) {
      debugLog('[CommunityProfile] resume creator onboarding', {
        step: profile.creatorOnboardingStep,
      })
      autoResumeDoneRef.current = true
      setResumeCreator(true)
    }
  }, [profile, profileDeleted])

  if (role === COMMUNITY_ROLES.DESIGNER) {
    return (
      <>
        <CommunityDesignerProfile />
        <RegistrationWizard
          open={resumeDesigner}
          onClose={() => setResumeDesigner(false)}
        />
      </>
    )
  }

  if (can(role, 'canPost')) {
    return (
      <>
        <CommunityCreatorProfile />
        <CreatorWizard open={resumeCreator} onClose={() => setResumeCreator(false)} />
      </>
    )
  }

  return <CommunityProfileJoin />
}
