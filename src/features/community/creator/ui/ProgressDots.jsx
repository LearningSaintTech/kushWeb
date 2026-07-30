import { TOTAL_STEPS } from '../stepsConfig'

export default function ProgressDots({ current }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1
        const isCurrent = step === current
        return (
          <span
            key={step}
            className={
              isCurrent
                ? 'h-1.5 w-1.5 rounded-full bg-black'
                : 'h-1.5 w-1.5 rounded-full bg-neutral-300'
            }
          />
        )
      })}
    </div>
  )
}
