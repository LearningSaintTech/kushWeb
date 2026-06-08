import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check } from 'lucide-react'
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
function ScallopedCheckIcon({ className = 'h-11 w-11 sm:h-14 sm:w-14' }) {
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <path
        fill="#000"
        d="M28 4c1.2 0 2.2.9 2.4 2.1l.3 2.1 1.8-.6c1.1-.4 2.3.2 2.7 1.3l.7 1.9 1.9-.2c1.2-.1 2.2.8 2.3 2l.2 2 2-.2c1.2-.1 2.3.7 2.4 1.9l.3 2.1 1.8.6c1.1.4 1.7 1.6 1.3 2.7l-.7 1.9 1.2 1.4c.8.9.7 2.3-.2 3.1l-1.6 1.5.9 1.7c.5 1.1 0 2.3-1.1 2.8l-1.8.8.2 1.9c.1 1.2-.8 2.2-2 2.3l-2 .2-.2 2c-.1 1.2-1.1 2.1-2.3 2l-2-.2-.6 1.8c-.4 1.1-1.6 1.7-2.7 1.3l-1.9-.7-1.4 1.2c-.9.8-2.3.7-3.1-.2l-1.5-1.6-1.7.9c-1.1.5-2.3 0-2.8-1.1l-.8-1.8-1.9.2c-1.2.1-2.2-.8-2.3-2l-.2-2-2 .2c-1.2.1-2.3-.7-2.4-1.9l-.3-2.1-1.8-.6c-1.1-.4-1.7-1.6-1.3-2.7l.7-1.9-1.2-1.4c-.8-.9-.7-2.3.2-3.1l1.6-1.5-.9-1.7c-.5-1.1 0-2.3 1.1-2.8l1.8-.8-.2-1.9c-.1-1.2.8-2.2 2-2.3l2-.2.2-2c.1-1.2 1.1-2.1 2.3-2l2 .2.6-1.8c.4-1.1 1.6-1.7 2.7-1.3l1.9.7 1.4-1.2c.9-.8 2.3-.7 3.1.2l1.5 1.6 1.7-.9c1.1-.5 2.3 0 2.8 1.1l.8 1.8 1.9-.2c1.2-.1 2.2.8 2.3 2l.2 2 2-.2c1.2-.1 2.3.7 2.4 1.9l.3 2.1z"
      />
      <path
        d="M20 28l5 5 11-13"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function formatInr(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** Spaced letters that wrap cleanly on narrow viewports */
function GiftCodeDisplay({ code, className = '' }) {
  const chars = useMemo(
    () => String(code || '').replace(/\s+/g, '').split(''),
    [code]
  )
  if (!chars.length) return null
  return (
    <div
      className={`mx-auto flex max-w-full flex-wrap justify-center gap-x-1 gap-y-1 px-1 sm:gap-x-1.5 sm:gap-y-1.5 md:gap-x-2 ${className}`}
      aria-label={String(code).replace(/\s+/g, '')}
    >
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="font-['Poltawski Now'] inline-flex min-w-[0.65em] justify-center text-lg leading-none text-black sm:text-2xl md:text-3xl lg:text-4xl"
        >
          {ch}
        </span>
      ))}
    </div>
  )
}

export default function GiftCardPurchasedModal({
  open,
  onClose,
  code = '',
  giftValue = 0,
  paidAmount = 0,
  shareUrl = '',
  onSelfRedeem,
  selfRedeeming = false,
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    setCopied(false)
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

  const shareText = useMemo(
    () => (shareUrl ? `Redeem your Khush gift card: ${shareUrl}` : ''),
    [shareUrl]
  )

  const shareActions = useMemo(
    () => [
      {
        key: 'whatsapp',
        label: 'Share on WhatsApp',
        className: 'bg-[#25D366]',
        href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      },
      {
        key: 'facebook',
        label: 'Share on Facebook',
        className: 'bg-[#1877F2]',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      },
      {
        key: 'twitter',
        label: 'Share on X',
        className: 'bg-[#1DA1F2]',
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      },
      {
        key: 'telegram',
        label: 'Share on Telegram',
        className: 'bg-[#26A5E4]',
        href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      },
      {
        key: 'linkedin',
        label: 'Share on LinkedIn',
        className: 'bg-[#0A66C2]',
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      },
    ],
    [shareUrl, shareText]
  )

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [shareUrl])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden overscroll-none bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full max-w-[min(100%,26rem)] max-h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem),94dvh,720px)] min-h-0 flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white text-center shadow-xl sm:max-w-md sm:rounded-2xl md:max-w-lg lg:max-w-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-purchased-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full p-2 text-black transition hover:bg-black/5 hover:opacity-70 sm:right-3 sm:top-3"
          aria-label="Close"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </button>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
          <div className="mx-auto flex w-fit justify-center">
            <ScallopedCheckIcon className="h-10 w-10 sm:h-14 sm:w-14" />
          </div>

          <h2
            id="gift-purchased-title"
            className="font-inter mt-4 px-4 text-sm font-bold uppercase leading-snug tracking-[0.12em] text-black sm:mt-5 sm:px-8 sm:text-lg sm:leading-tight sm:tracking-[0.18em] md:text-xl md:tracking-[0.2em]"
          >
            Gift Card Purchased
          </h2>
          <p className="font-inter mt-1.5 px-2 text-xs leading-snug text-[#757575] sm:mt-2 sm:text-sm">
            Your gift card ready to share
          </p>

          <hr className="mx-auto mt-4 w-full max-w-[min(100%,280px)] border-gray-200 sm:mt-6" />

          <p className="font-inter mt-4 text-[10px] text-[#757575] sm:mt-6 sm:text-xs">
            Unique Gift Number
          </p>
          <div className="mt-2 select-all sm:mt-2.5">
            <GiftCodeDisplay code={code} />
          </div>

          <div className="mt-4 flex flex-col overflow-hidden rounded-lg bg-[#F5F5F5] sm:mt-6 sm:flex-row">
            <div className="flex-1 px-4 py-3.5 sm:py-4">
              <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-[#757575]">
                Gift Card Value
              </p>
              <p className="font-inter mt-0.5 text-lg font-bold text-[#E65100] sm:mt-1 sm:text-xl md:text-2xl">
                {formatInr(giftValue)}
              </p>
            </div>
            <div className="flex-1 border-t border-gray-200 px-4 py-3.5 sm:border-l sm:border-t-0 sm:py-4">
              <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-[#757575]">
                Amount You Paid
              </p>
              <p className="font-inter mt-0.5 text-lg font-bold text-black sm:mt-1 sm:text-xl md:text-2xl">
                {formatInr(paidAmount)}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={selfRedeeming || !code}
            onClick={onSelfRedeem}
            className="font-inter mt-4 min-h-[44px] w-full touch-manipulation rounded-md bg-black py-3 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:min-h-[48px] sm:py-3.5 sm:text-sm"
          >
            {selfRedeeming ? 'Processing…' : 'Self Redeem'}
          </button>

          <p className="font-inter my-3 text-xs font-normal uppercase text-black sm:my-4 sm:text-sm">
            Or
          </p>

          <div className="relative w-full min-w-0">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full min-w-0 break-all rounded-md border border-gray-300 bg-white py-2.5 pl-3 pr-11 font-inter text-[10px] leading-snug text-[#757575] outline-none sm:truncate sm:py-3 sm:pr-12 sm:text-xs sm:leading-normal md:text-sm"
              aria-label="Gift card share link"
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!shareUrl}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-black transition hover:bg-black/5 hover:opacity-70 disabled:opacity-40 sm:right-2 sm:h-10 sm:w-10"
              aria-label={copied ? 'Copied' : 'Copy link'}
            >
              {copied ? (
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Copy className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pb-1 sm:mt-6 sm:gap-2.5 md:gap-3">
            {shareActions.map(({ key, label, className, href }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                disabled={!shareUrl}
                onClick={() => shareUrl && window.open(href, '_blank', 'noopener,noreferrer')}
                className={`flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-lg text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10 md:size-11 ${className}`}
              >
                {key === 'whatsapp' && <FaWhatsapp className="size-3.5 sm:size-4" />}
                {key === 'facebook' && <FaFacebookF className="size-3 sm:size-3.5" />}
                {key === 'twitter' && <FaXTwitter className="size-3 sm:size-3.5" />}
                {key === 'telegram' && <FaTelegramPlane className="size-3.5 sm:size-4" />}
                {key === 'linkedin' && <FaLinkedinIn className="size-3 sm:size-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
