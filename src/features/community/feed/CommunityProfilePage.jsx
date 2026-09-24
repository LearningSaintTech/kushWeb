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
  isDesignerRoleReady,
} from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'

/**
 * Profile entry — joins for normal users; creator / designer dashboards by role.
 * Designer dashboard only after onboarding is complete. Incomplete designer
 * flow stays on creator/join and can resume the wizard.
 */
export default function CommunityProfilePage() {
  const outletCtx = useCommunityFeedUi()
  const role = useCommunityRole()
  const { profile, refresh } = useCommunityProfile()
  const [resumeCreator, setResumeCreator] = useState(false)
  const [resumeDesigner, setResumeDesigner] = useState(false)
  const autoResumeDoneRef = useRef(false)
  const profileDeleted = isCommunityProfileDeleted(profile)
  const designerReady = isDesignerRoleReady(profile)

  useEffect(() => {
    if (!profile || autoResumeDoneRef.current || profileDeleted) return

    const designerIncomplete = isDesignerOnboardingIncomplete(profile)
    const creatorIncomplete = isCreatorOnboardingIncomplete(profile)

    if (designerIncomplete && !designerReady) {
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
  }, [profile, profileDeleted, designerReady])

  const handleDesignerWizardClose = () => {
    setResumeDesigner(false)
    refresh()
  }

  const handleCreatorWizardClose = () => {
    setResumeCreator(false)
    refresh()
  }

  const wizard = (
    <>
      <RegistrationWizard open={resumeDesigner} onClose={handleDesignerWizardClose} />
      <CreatorWizard open={resumeCreator} onClose={handleCreatorWizardClose} />
    </>
  )

  if (profileDeleted) {
    return (
      <>
        <CommunityProfileJoin />
        {wizard}
      </>
    )
  }

  if (designerReady || role === COMMUNITY_ROLES.DESIGNER) {
    return (
      <>
        <CommunityDesignerProfile {...outletCtx} />
        {wizard}
      </>
    )
  }

  if (can(role, 'canPost') || profile?.isCreator) {
    return (
      <>
        <CommunityCreatorProfile {...outletCtx} />
        {wizard}
      </>
    )
  }

  return (
    <>
      <CommunityProfileJoin />
      {wizard}
    </>
  )
}
