import { useEffect, useRef, useState } from 'react'
import { useCommunityFeedUi } from '../context/CommunityFeedUiContext'
import { useCommunityRole } from '../hooks/useCommunityRole'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import { can, COMMUNITY_ROLES } from '../capabilities'
import CommunityProfileJoin from './CommunityProfileJoin'
import CommunityCreatorProfile from './CommunityCreatorProfile'
import CommunityDesignerProfile from './CommunityDesignerProfile'
import CreatorWizard from '../creator/CreatorWizard'
import RegistrationWizard from '../registration/RegistrationWizard'
import {
  isCommunityProfileDeleted,
  isDesignerOnboardingIncomplete,
  isCreatorOnboardingIncomplete,
} from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'

/**
 * Profile entry — joins for normal users; creator / designer dashboards by role.
 * Incomplete onboarding resumes the matching wizard once per visit.
 */
export default function CommunityProfilePage() {
  const outletCtx = useCommunityFeedUi()
  const role = useCommunityRole()
  const { profile } = useCommunityProfile()
  const [resumeCreator, setResumeCreator] = useState(false)
  const [resumeDesigner, setResumeDesigner] = useState(false)
  const autoResumeDoneRef = useRef(false)
  const profileDeleted = isCommunityProfileDeleted(profile)

  useEffect(() => {
    if (!profile || autoResumeDoneRef.current || profileDeleted) return

    const designerIncomplete = isDesignerOnboardingIncomplete(profile)
    const creatorIncomplete = isCreatorOnboardingIncomplete(profile)

    if (designerIncomplete) {
      debugLog('[CommunityProfile] resume designer onboarding', {
        step: profile.designerOnboardingStep,
        status: profile.designerVerificationStatus,
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
        <CommunityDesignerProfile {...outletCtx} />
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
        <CommunityCreatorProfile {...outletCtx} />
        <CreatorWizard open={resumeCreator} onClose={() => setResumeCreator(false)} />
      </>
    )
  }

  return <CommunityProfileJoin />
}
