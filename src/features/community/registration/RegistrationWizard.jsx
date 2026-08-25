import { useCallback, useEffect, useState } from 'react'
import WizardShell from './WizardShell'
import {
  INITIAL_FORM_DATA,
  TOTAL_STEPS,
  validateStep,
} from './stepsConfig'
import StepEssentials from './steps/StepEssentials'
import StepMedia from './steps/StepMedia'
import StepSkills from './steps/StepSkills'
import StepExperience from './steps/StepExperience'
import StepEducation from './steps/StepEducation'
import StepBio from './steps/StepBio'
import StepLinks from './steps/StepLinks'
import StepSuccess from './steps/StepSuccess'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import {
  communityProfileService,
  getCommunityProfileErrorMessage,
  buildDesignerEducationBody,
  buildDesignerEssentialsBody,
  buildDesignerExperienceBody,
  buildDesignerLinksBody,
  buildDesignerSceneFormData,
  buildDesignerSkillsBody,
  buildDesignerStoryBody,
  designerStepIndex,
  hydrateDesignerForm,
  isCommunityProfileDeleted,
} from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'

const STEP_COMPONENTS = {
  1: StepEssentials,
  2: StepMedia,
  3: StepSkills,
  4: StepExperience,
  5: StepEducation,
  6: StepBio,
  7: StepLinks,
  8: StepSuccess,
}

const FORM_STEPS = TOTAL_STEPS - 1

function cloneInitialForm() {
  return {
    ...INITIAL_FORM_DATA,
    skills: INITIAL_FORM_DATA.skills.map((s) => ({ ...s })),
    experience: INITIAL_FORM_DATA.experience.map((r) => ({ ...r })),
    education: INITIAL_FORM_DATA.education.map((e) => ({ ...e })),
    hubs: {
      dribbble: { ...INITIAL_FORM_DATA.hubs.dribbble },
      behance: { ...INITIAL_FORM_DATA.hubs.behance },
      twitter: { ...INITIAL_FORM_DATA.hubs.twitter },
      website: { ...INITIAL_FORM_DATA.hubs.website },
    },
    customLinks: [],
  }
}

export default function RegistrationWizard({ open, onClose, forceFresh = false }) {
  const { profile, refresh, applyProfile } = useCommunityProfile()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(cloneInitialForm)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)

  const reset = useCallback(() => {
    setStep(1)
    setFormData(cloneInitialForm())
    setError(null)
    setSaving(false)
    setBootstrapped(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose?.()
  }, [onClose, reset])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  // Bootstrap once when opened — do not depend on `profile` (refresh updates it and
  // would cancel mid-flight, leaving saving stuck true and the modal unclosable).
  useEffect(() => {
    if (!open || bootstrapped) return undefined
    let cancelled = false

    ;(async () => {
      setSaving(true)
      setError(null)
      // Always start empty; only resume mid-onboarding after hydrate checks pass
      setFormData(cloneInitialForm())
      setStep(1)
      try {
        const refreshed = await refresh()
        if (cancelled) return
        // Keep delete / re-onboard flags if GET /user/community-profile dropped them
        const latest = {
          ...(refreshed || profile || {}),
          ...(isCommunityProfileDeleted(profile)
            ? {
                communityProfileStatus: 'deleted',
                requiresOnboarding: true,
                deleted: true,
                isDesigner: false,
                isCreator: false,
                designerOnboardingStep: 'not_started',
                creatorOnboardingStep: 'not_started',
              }
            : {}),
        }
        const nextForm =
          forceFresh || isCommunityProfileDeleted(latest)
            ? cloneInitialForm()
            : hydrateDesignerForm(latest, cloneInitialForm())
        const nextStep =
          forceFresh || isCommunityProfileDeleted(latest)
            ? 1
            : designerStepIndex(latest)
        setFormData(nextForm)
        setStep(nextStep)
        debugLog('[CommunityProfile] designer wizard resume', {
          step: nextStep,
          prefilled: Boolean(nextForm?.username || nextForm?.fullName),
          isDesigner: latest?.isDesigner,
          designerOnboardingStep: latest?.designerOnboardingStep,
          communityProfileStatus: latest?.communityProfileStatus,
          requiresOnboarding: latest?.requiresOnboarding,
        })
        setBootstrapped(true)
      } catch (err) {
        if (!cancelled) {
          setError(getCommunityProfileErrorMessage(err))
          setFormData(cloneInitialForm())
          setStep(1)
          setBootstrapped(true)
        }
      } finally {
        setSaving(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per open
  }, [open, bootstrapped])

  if (!open) return null

  const patchForm = (slice) => {
    setFormData((prev) => ({ ...prev, ...slice }))
    setError(null)
  }

  const saveCurrentStep = async () => {
    if (step === 1) {
      return applyProfile(
        await communityProfileService.patchDesignerEssentials(
          buildDesignerEssentialsBody(formData),
        ),
      )
    }
    if (step === 2) {
      const hasFiles =
        formData.profilePhoto instanceof File || formData.coverImage instanceof File
      if (hasFiles) {
        return applyProfile(
          await communityProfileService.patchDesignerScene(
            buildDesignerSceneFormData(formData),
          ),
        )
      }
      // No new uploads — advance via skip so onboardingStep moves
      return applyProfile(await communityProfileService.skipDesignerStep())
    }
    if (step === 3) {
      return applyProfile(
        await communityProfileService.patchDesignerSkills(
          buildDesignerSkillsBody(formData),
        ),
      )
    }
    if (step === 4) {
      return applyProfile(
        await communityProfileService.patchDesignerExperience(
          buildDesignerExperienceBody(formData),
        ),
      )
    }
    if (step === 5) {
      return applyProfile(
        await communityProfileService.patchDesignerEducation(
          buildDesignerEducationBody(formData),
        ),
      )
    }
    if (step === 6) {
      return applyProfile(
        await communityProfileService.patchDesignerStory(
          buildDesignerStoryBody(formData),
        ),
      )
    }
    if (step === 7) {
      await communityProfileService.patchDesignerLinks(buildDesignerLinksBody(formData))
      return applyProfile(await communityProfileService.completeDesigner())
    }
    return profile
  }

  const advanceAfterSave = (updated) => {
    const fromApi = designerStepIndex(updated)
    if (step >= FORM_STEPS) {
      setStep(TOTAL_STEPS)
      return
    }
    setStep(Math.max(step + 1, fromApi))
  }

  const handleContinue = async () => {
    if (step === TOTAL_STEPS) {
      handleClose()
      return
    }
    const err = validateStep(step, formData)
    if (err) {
      setError(err)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await saveCurrentStep()
      debugLog('[CommunityProfile] designer step saved', {
        uiStep: step,
        designerOnboardingStep: updated?.designerOnboardingStep,
        designerVerificationStatus: updated?.designerVerificationStatus,
      })
      advanceAfterSave(updated)
      if (step >= FORM_STEPS) await refresh()
    } catch (e) {
      setError(getCommunityProfileErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (step >= FORM_STEPS || saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = applyProfile(await communityProfileService.skipDesignerStep())
      debugLog('[CommunityProfile] designer skip', {
        uiStep: step,
        designerOnboardingStep: updated?.designerOnboardingStep,
      })
      advanceAfterSave(updated)
    } catch (e) {
      setError(getCommunityProfileErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (saving) return
    setError(null)
    if (step <= 1) {
      handleClose()
      return
    }
    if (step === TOTAL_STEPS) return
    setStep((s) => s - 1)
  }

  const StepComponent = STEP_COMPONENTS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close registration"
        className="absolute inset-0 cursor-pointer bg-black/75"
        onClick={handleClose}
      />
      <div className="scrollbar-hide relative z-10 max-h-[min(92vh,720px)] w-full max-w-md overflow-y-auto">
        <WizardShell
          step={step}
          onBack={handleBack}
          onSkip={handleSkip}
          onContinue={handleContinue}
          continueLabel={
            saving ? 'Saving…' : step === TOTAL_STEPS ? 'Got it' : 'Continue'
          }
          continueDisabled={saving}
          skipDisabled={saving}
          error={error}
        >
          <StepComponent data={formData} onChange={patchForm} />
        </WizardShell>
      </div>
    </div>
  )
}
