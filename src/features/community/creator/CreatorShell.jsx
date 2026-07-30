import ProgressDots from './ui/ProgressDots'
import { STEPS, SUCCESS_STEP } from './stepsConfig'

export default function CreatorShell({
  step,
  onBack,
  onClose,
  onContinue,
  continueLabel,
  continueDisabled = false,
  error = null,
  children,
  footerExtra = null,
}) {
  const isSuccess = step === SUCCESS_STEP
  const meta = STEPS[step - 1]
  const showBack = !isSuccess && step > 1

  return (
    <div
      className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-wizard-title"
    >
      <div className="flex items-start gap-3 px-6 pt-6 sm:px-7 sm:pt-7">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-black"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        ) : (
          <span className="h-8 w-8 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <h2
            id="creator-wizard-title"
            className="font-inter text-xl font-bold tracking-tight text-black sm:text-[1.35rem]"
          >
            {isSuccess ? 'Done' : meta.title}
          </h2>
          {!isSuccess ? (
            <div className="mt-3">
              <ProgressDots current={step} />
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-black"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto px-6 pb-2 pt-8 sm:px-7">
        {children}

        {error ? (
          <p className="mt-3 font-inter text-xs text-red-500" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="w-full cursor-pointer rounded-xl bg-black py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {continueLabel}
        </button>
        {footerExtra}
      </div>
    </div>
  )
}
