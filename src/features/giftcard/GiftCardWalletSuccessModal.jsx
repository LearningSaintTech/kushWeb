import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function WalletSuccessIcon({ className = 'h-14 w-14 sm:h-16 sm:w-16' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M12 14l3 3M52 14l-3 3"
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 12l2.5 2.5M54 12l-2.5 2.5"
        fill="#000"
      />
      <circle cx="32" cy="34" r="22" fill="none" stroke="#000" strokeWidth="2.5" />
      <path
        d="M22 34l7 7 13-16"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M8 10l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#000" />
      <path d="M56 10l-2 4-4 1 3 3-1 4 4-2 4 2-1-4 3-3-4-1z" fill="#000" />
    </svg>
  )
}

function formatInr(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function GiftCardWalletSuccessModal({ open, onClose, amount = 0 }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden overscroll-none bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[min(100%,22rem)] rounded-xl border border-gray-200 bg-white px-5 py-8 text-center shadow-xl sm:max-w-sm sm:rounded-2xl sm:px-8 sm:py-10 md:py-12"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-success-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full p-2 text-black transition hover:bg-black/5 sm:right-3 sm:top-3"
          aria-label="Close"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </button>

        <div className="mx-auto flex w-fit justify-center">
          <WalletSuccessIcon />
        </div>

        <h2
          id="wallet-success-title"
          className="font-inter mt-5 text-base font-bold uppercase leading-tight tracking-[0.12em] text-black sm:mt-6 sm:text-lg sm:tracking-[0.16em]"
        >
          Money Added
          <br />
          Successfully To Wallet
        </h2>

        <p className="font-inter mt-4 text-sm leading-relaxed text-[#333333] sm:mt-5 sm:text-base">
          {formatInr(amount)} has been added to your wallet.
          <br />
          You can now use it for payments.
        </p>
      </div>
    </div>,
    document.body
  )
}
