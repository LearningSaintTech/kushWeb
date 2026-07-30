/**
 * First create step — choose Reel or Post.
 */
export default function CreateTypeModal({ open, onClose, onSelect }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create"
        className="relative z-10 w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6"
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onSelect?.('reel')}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-[#f5f5f5] transition hover:bg-[#eeeeee] active:scale-[0.98]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white sm:h-16 sm:w-16">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
                <path strokeLinecap="round" d="M7 6.5v11M17 6.5v11M3.5 10h3.5M3.5 14h3.5M17 10h3.5M17 14h3.5" />
              </svg>
            </span>
            <span className="font-inter text-base font-bold text-black">Reel</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect?.('post')}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-[#f5f5f5] transition hover:bg-[#eeeeee] active:scale-[0.98]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white sm:h-16 sm:w-16">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="4" y="4" width="7" height="7" rx="1.2" />
                <rect x="13" y="4" width="7" height="7" rx="1.2" />
                <rect x="4" y="13" width="7" height="7" rx="1.2" />
                <rect x="13" y="13" width="7" height="7" rx="1.2" />
              </svg>
            </span>
            <span className="font-inter text-base font-bold text-black">Post</span>
          </button>
        </div>
      </div>
    </div>
  )
}
