export default function StepSuccess() {
  return (
    <div className="flex flex-col items-center pb-2 pt-1 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-50"
        aria-hidden
      >
        <svg
          className="h-10 w-10 text-black"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h3 className="mt-8 font-inter text-3xl font-bold tracking-tight text-black">
        Profile Created!
      </h3>
      <p className="mt-3 max-w-[17rem] font-inter text-sm leading-relaxed text-neutral-500">
        Your profile is live. Start sharing with the world and connect with other creators.
      </p>
    </div>
  )
}
