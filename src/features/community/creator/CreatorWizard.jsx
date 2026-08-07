import { useCallback, useEffect, useState } from 'react'
import CreatorShell from './CreatorShell'
import StepPhoto from './steps/StepPhoto'
import StepBasicInfo from './steps/StepBasicInfo'
import StepAbout from './steps/StepAbout'
import StepPrivate from './steps/StepPrivate'
import StepSuccess from './steps/StepSuccess'
import {
  INITIAL_FORM_DATA,
  STEPS,
  SUCCESS_STEP,
  TOTAL_STEPS,
  validateStep,
} from './stepsConfig'
import { useCommunityProfile } from '../context/CommunityProfileContext'
import {
  communityProfileService,
  getCommunityProfileErrorMessage,
  buildCreatorAboutBody,
  buildCreatorBasicBody,
  buildCreatorPhotoFormData,
  buildCreatorPrivateBody,
  creatorStepIndex,
  hydrateCreatorForm,
} from '../../../services/communityProfile.service'
import { debugLog } from '../../../utils/debugLog'

const STEP_COMPONENTS = {
  1: StepPhoto,
  2: StepBasicInfo,
  3: StepAbout,
  4: StepPrivate,
  5: StepSuccess,
}

export default function CreatorWizard({ open, onClose }) {
  const { profile, refresh, applyProfile } = useCommunityProfile()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)

  const reset = useCallback(() => {
    setStep(1)
    setFormData(INITIAL_FORM_DATA)
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
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, open, saving])

  useEffect(() => {
    if (!open || bootstrapped) return undefined
    let cancelled = false

    ;(async () => {
      setSaving(true)
      setError(null)
      try {
        const latest = (await refresh()) || profile
        if (cancelled) return
        const nextForm = hydrateCreatorForm(latest, INITIAL_FORM_DATA)
        const nextStep = creatorStepIndex(latest)
        setFormData(nextForm)
        setStep(nextStep >= SUCCESS_STEP ? SUCCESS_STEP : nextStep)
        debugLog('[CommunityProfile] creator wizard resume', {
          step: nextStep,
          creatorOnboardingStep: latest?.creatorOnboardingStep,
        })
        setBootstrapped(true)
      } catch (err) {
        if (!cancelled) {
          setError(getCommunityProfileErrorMessage(err))
          setBootstrapped(true)
        }
      } finally {
        if (!cancelled) setSaving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bootstrapped, open, profile, refresh])

  if (!open) return null

  const patchForm = (slice) => {
    setFormData((previous) => ({ ...previous, ...slice }))
    setError(null)
  }

  const saveCurrentStep = async () => {
    if (step === 1) {
      if (!(formData.photo instanceof File) && !formData.photoPreview) {
        throw new Error('Please add a profile photo.')
      }
      if (formData.photo instanceof File) {
        const fd = buildCreatorPhotoFormData(formData)
        return applyProfile(await communityProfileService.patchCreatorPhoto(fd))
      }
      // Already has a remote photo — advance via skip
      return applyProfile(await communityProfileService.skipCreatorStep())
    }
    if (step === 2) {
      return applyProfile(
        await communityProfileService.patchCreatorBasic(buildCreatorBasicBody(formData)),
      )
    }
    if (step === 3) {
      return applyProfile(
        await communityProfileService.patchCreatorAbout(buildCreatorAboutBody(formData)),
      )
    }
    if (step === 4) {
      await communityProfileService.patchCreatorPrivate(buildCreatorPrivateBody(formData))
      return applyProfile(await communityProfileService.completeCreator())
    }
    return profile
  }

  const handleContinue = async () => {
    if (step === SUCCESS_STEP) {
      handleClose()
      return
    }

    const validationError = validateStep(step, formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await saveCurrentStep()
      debugLog('[CommunityProfile] creator step saved', {
        uiStep: step,
        creatorOnboardingStep: updated?.creatorOnboardingStep,
      })
      if (step === TOTAL_STEPS) {
        setStep(SUCCESS_STEP)
        await refresh()
        return
      }
      const nextFromApi = creatorStepIndex(updated)
      setStep(Math.max(step + 1, nextFromApi))
    } catch (err) {
      setError(getCommunityProfileErrorMessage(err))
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
    if (step === SUCCESS_STEP) return
    setStep((current) => current - 1)
  }

  const StepComponent = STEP_COMPONENTS[step]
  const isSuccess = step === SUCCESS_STEP

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close creator registration"
        className="absolute inset-0 cursor-pointer"
        onClick={saving ? undefined : handleClose}
      />
      <div className="scrollbar-hide relative z-10 max-h-[min(94vh,700px)] w-full max-w-md overflow-y-auto">
        <CreatorShell
          step={step}
          onBack={handleBack}
          onClose={handleClose}
          onContinue={handleContinue}
          continueLabel={
            saving
              ? 'Saving…'
              : isSuccess
                ? 'Go to Profile'
                : STEPS[step - 1].continueLabel
          }
          continueDisabled={saving}
          error={error}
          footerExtra={
            isSuccess ? (
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 w-full cursor-pointer font-inter text-sm font-semibold text-black transition hover:text-black"
              >
                Explore Feed
              </button>
            ) : null
          }
        >
          <StepComponent data={formData} onChange={patchForm} />
        </CreatorShell>
      </div>
    </div>
  )
}
