export default function StepSuccess() {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full border-[2px] border-[#8B5CF6]/70  bg-[#8B5CF6]/10 sm:h-32 sm:w-32"
        aria-hidden
      >
        <svg
          className="h-12 w-12 text-[#C4B5FD] sm:h-14 sm:w-14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#C45C26]/50 bg-[#F59E0B1A] px-3 py-1">
        <svg
          className="h-3.5 w-3.5 text-[#E87A3A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-inter text-xs font-medium text-[#F59E0B]">Pending</span>
      </div>

      <p className="mt-5 max-w-[16rem] font-inter text-sm leading-relaxed text-white/45">
        You&apos;ll be notified once your profile is approved by the admin.
      </p>
    </div>
  )
}
