import { TOTAL_STEPS } from '../stepsConfig'

export default function ProgressDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1
        const isCurrent = step === current
        const isDone = step < current
        return (
          <span
            key={step}
            className={
              isCurrent
                ? 'h-1.5 w-5 rounded-full bg-[#8B5CF6]'
                : isDone
                  ? 'h-1.5 w-1.5 rounded-full bg-[#8B5CF6]'
                  : 'h-1.5 w-1.5 rounded-full bg-white/20'
            }
          />
        )
      })}
    </div>
  )
}
