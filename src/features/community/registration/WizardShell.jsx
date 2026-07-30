import ProgressDots from './ui/ProgressDots'
import { STEPS, TOTAL_STEPS } from './stepsConfig'

export default function WizardShell({
  step,
  onBack,
  onSkip,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  skipDisabled = false,
  error = null,
  children,
}) {
  const meta = STEPS[step - 1]
  const isSuccess = step === TOTAL_STEPS

  return (
    <div
      className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/5 shadow-2xl"
      style={{
        '--reg-accent': '#8B5CF6',
        background: '#141414',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-wizard-title"
    >
      {!isSuccess ? (
        <div className="flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="text-center">
            <p className="font-inter text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
              Step {step} of {TOTAL_STEPS}
            </p>
            <div className="mt-2">
              <ProgressDots current={step} />
            </div>
          </div>

          <button
            type="button"
            onClick={onSkip}
            disabled={skipDisabled}
            className="cursor-pointer px-2 font-inter text-sm text-white/55 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Skip
          </button>
        </div>
      ) : null}

      <div
        className={`scrollbar-hide flex-1 overflow-y-auto px-5 pb-2 sm:px-6 ${
          isSuccess ? 'pt-10 sm:pt-12' : 'pt-6'
        }`}
      >
        <h2
          id="reg-wizard-title"
          className={`font-refer-display font-normal font-PlayFair leading-tight tracking-tight text-white ${
            isSuccess
              ? 'text-center text-[1.85rem] sm:text-[2.15rem]'
              : 'text-[1.75rem] sm:text-[2rem]'
          }`}
        >
          {meta.title}
        </h2>
        <p
          className={`mt-1.5 font-inter text-sm text-white/45 ${
            isSuccess ? 'mx-auto max-w-[20rem] text-center' : ''
          }`}
        >
          {meta.subtitle}
        </p>

        <div className={isSuccess ? 'mt-8' : 'mt-6'}>{children}</div>

        {error ? (
          <p className="mt-3 font-inter text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="w-full cursor-pointer rounded-xl bg-[#8B5CF6] py-3.5 font-inter text-sm font-semibold text-white shadow-[0_8px_24px_rgba(139,92,246,0.35)] transition hover:bg-[#7c4feb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}
