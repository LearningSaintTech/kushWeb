import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check } from 'lucide-react'
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import frameBanner from '../../assets/temporary/Frame 2147225414.png'
import { splitCodeForDisplay } from '../../services/giftcard.service.js'

function formatInr(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function GiftCardCreatedShareModal({
  open,
  onClose,
  card,
  bannerImage = '',
  multiplier = 2,
  shareUrl = '',
  onRedeem,
  redeeming = false,
}) {
  const [redeemCode, setRedeemCode] = useState('')
  const [copied, setCopied] = useState(false)

  const code = card?.code || ''
  const displayCode = splitCodeForDisplay(redeemCode || code)
  const promoImage = card?.image || bannerImage || frameBanner

  useEffect(() => {
    if (!open) return undefined
    setRedeemCode(code)
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
  }, [open, onClose, code])

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

  const handleRedeemClick = () => {
    const normalized = redeemCode.trim().toUpperCase().replace(/\s/g, '')
    if (!normalized) return
    onRedeem?.(normalized)
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden overscroll-none bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full max-w-[min(100%,28rem)] max-h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem),92dvh,780px)] min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl md:max-w-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-created-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full p-2 text-black transition hover:bg-black/5 sm:right-3 sm:top-3"
          aria-label="Close"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </button>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6 md:px-6">
          <div className="overflow-hidden rounded-lg bg-[#F2F2F2]">
            <div className="flex flex-col gap-3 p-3 min-[420px]:flex-row min-[420px]:items-stretch sm:p-4">
              <div className="min-w-0 flex-1">
                <h2
                  id="gift-created-modal-title"
                  className="font-inter text-lg font-bold italic leading-tight text-black sm:text-xl"
                >
                  GIFT MORE.
                  <span className="block font-normal italic">GET MORE.</span>
                </h2>
                <hr className="my-2 max-w-[140px] border-black/30" />
                <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-[#333333] sm:text-[11px]">
                EXTRA VALUE ON {' '}
                  <span className="font-bold text-[#E65100]">
                    {/* {multiplier ? `${multiplier}×` : 'double'} */}
                  </span>{' '}
                  EVERY PURCHASE.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white sm:h-10 sm:w-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 25 25" fill="none" aria-hidden="true">
                      <path
                        d="M12.0501 7.03177V21.0921M12.0501 7.03177C11.6868 5.53474 11.0613 4.2549 10.2552 3.35916C9.44898 2.46341 8.49956 1.99332 7.53072 2.0102C6.86482 2.0102 6.22619 2.27473 5.75533 2.7456C5.28447 3.21646 5.01994 3.85509 5.01994 4.52099C5.01994 5.18689 5.28447 5.82551 5.75533 6.29638C6.22619 6.76724 6.86482 7.03177 7.53072 7.03177M12.0501 7.03177C12.4134 5.53474 13.0389 4.2549 13.8451 3.35916C14.6513 2.46341 15.6007 1.99332 16.5695 2.0102C17.2354 2.0102 17.8741 2.27473 18.3449 2.7456C18.8158 3.21646 19.0803 3.85509 19.0803 4.52099C19.0803 5.18689 18.8158 5.82551 18.3449 6.29638C17.8741 6.76724 17.2354 7.03177 16.5695 7.03177M20.0846 11.049V19.0835C20.0846 19.6162 19.873 20.1271 19.4963 20.5038C19.1196 20.8805 18.6087 21.0921 18.076 21.0921H6.02425C5.49153 21.0921 4.98063 20.8805 4.60394 20.5038C4.22725 20.1271 4.01563 19.6162 4.01562 19.0835V11.049"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20.0889 7.03125H4.01994C3.46527 7.03125 3.01562 7.4809 3.01562 8.03556V10.0442C3.01562 10.5989 3.46527 11.0485 4.01994 11.0485H20.0889C20.6436 11.0485 21.0932 10.5989 21.0932 10.0442V8.03556C21.0932 7.4809 20.6436 7.03125 20.0889 7.03125Z"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="font-inter text-[10px] leading-snug text-black sm:text-xs">
                    <span className="font-bold">The Joy Of Gifting</span>
                     <br />
                    <span className="italic text-gray-800">NOW EVEN BETTER..</span>
                  </p>
                </div>
                {/* {card?.giftValue != null && (
                  <p className="font-inter mt-2 text-xs font-semibold text-[#E65100] sm:text-sm">
                    Value {formatInr(card.giftValue)}
                  </p>
                )} */}
              </div>
              <div className="flex shrink-0 items-center justify-center min-[420px]:w-[38%]">
                <img
                  src={promoImage}
                  alt="Khush Gift Card"
                  className="h-auto max-h-[120px] w-full max-w-[160px] object-contain object-center sm:max-h-[140px]"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 text-center sm:mt-6">
            <p className="font-inter text-xs font-medium text-[#757575] sm:text-sm">
              Enter Unique Gift Number
            </p>
            <input
              type="text"
              value={displayCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              className="font-['Poltawski Now'] mt-2 w-full max-w-full border-0 border-b border-black bg-transparent py-2 text-center text-lg tracking-[0.2em] text-black outline-none focus:ring-0 min-[380px]:text-xl min-[380px]:tracking-[0.28em] sm:text-2xl sm:tracking-[0.35em] md:text-3xl"
              aria-label="Gift card code"
            />
          </div>

          <button
            type="button"
            disabled={redeeming || !redeemCode.trim()}
            onClick={handleRedeemClick}
            className="font-inter mt-4 min-h-[44px] w-full rounded-md bg-black py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5"
          >
            {redeeming ? 'Processing…' : 'Redeem'}
          </button>

          <p className="font-inter my-4 text-xs font-bold uppercase text-black sm:my-5 sm:text-sm">Or</p>

          <div className="relative w-full min-w-0">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full min-w-0 truncate rounded-md border border-gray-300 bg-white py-2.5 pl-3 pr-11 font-inter text-[10px] text-[#757575] outline-none sm:py-3 sm:pr-12 sm:text-xs"
              aria-label="Gift card share link"
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!shareUrl}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-black transition hover:bg-black/5 disabled:opacity-40 sm:right-2 sm:h-10 sm:w-10"
              aria-label={copied ? 'Copied' : 'Copy link'}
            >
              {copied ? (
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Copy className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pb-1 sm:mt-5 sm:gap-2.5 md:gap-3">
            {shareActions.map(({ key, label, className, href }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                disabled={!shareUrl}
                onClick={() => shareUrl && window.open(href, '_blank', 'noopener,noreferrer')}
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10 md:size-11 ${className}`}
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
