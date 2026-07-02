import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check } from 'lucide-react'
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import frameBanner from '../../assets/temporary/Frame 2147225414.png'
import { splitCodeForDisplay, normalizeGiftCardImageUrl } from '../../services/giftcard.service.js'
import GiftCardPromoBanner from './GiftCardPromoBanner.jsx'

export default function GiftCardCreatedShareModal({
  open,
  onClose,
  card,
  bannerImage = '',
  shareUrl = '',
  onRedeem,
  redeeming = false,
}) {
  const [redeemCode, setRedeemCode] = useState('')
  const [copied, setCopied] = useState(false)

  const code = card?.code || ''
  const displayCode = splitCodeForDisplay(redeemCode || code)
  const promoImage = normalizeGiftCardImageUrl(card?.image || bannerImage) || frameBanner

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
          <div className="overflow-hidden rounded-lg bg-white px-2 py-4 sm:px-3 sm:py-5">
            <GiftCardPromoBanner
              id="gift-created-modal-title"
              imageUrl={promoImage}
            />
            <div className="mt-4 flex justify-center sm:mt-5">
              <img
                src={promoImage}
                alt="Khush Gift Card"
                className="h-auto max-h-[120px] w-full max-w-[min(100%,12rem)] object-contain object-center sm:max-h-[140px] sm:max-w-[14rem]"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (e.currentTarget.src !== frameBanner) e.currentTarget.src = frameBanner
                }}
              />
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
