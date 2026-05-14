import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegramPlane } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { useAuth } from '../../../app/context/AuthContext'
import { ROUTES } from '../../../utils/constants'
import { referralService, unwrapReferralResponse } from '../../../services/referral.service.js'
import bgImg from '../../../assets/images/bg.png'

function normalizeReferralCode(raw) {
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).replace(/\s+/g, '').toUpperCase()
}

function splitCodeForDisplay(code) {
  return code.split('').join(' ')
}

/** Links to auth page with ?ref= so signup can pre-fill the referral field. */
function buildReferralLink(origin, code) {
  const base = `${String(origin || '').replace(/\/$/, '')}${ROUTES.AUTH}`
  const u = new URL(base)
  u.searchParams.set('ref', code)
  return u.toString()
}

/** Inner UI — used inside portrait modal */
function ReferEarnContent({ compact, referralCodeProp }) {
  const { user, isAuthenticated } = useAuth()
  const [fetchedCode, setFetchedCode] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [rewardLabel, setRewardLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    referralService
      .getPublicConfig()
      .then((res) => {
        const cfg = unwrapReferralResponse(res)
        const amt = Number(cfg?.referralRewardAmount)
        if (!cancelled && Number.isFinite(amt) && amt >= 0) {
          setRewardLabel(`₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`)
        }
      })
      .catch(() => { })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (referralCodeProp) {
      setFetchedCode(null)
      return undefined
    }
    const fromUser = normalizeReferralCode(user?.referralCode ?? user?.referral_code)
    if (fromUser) {
      setFetchedCode(fromUser)
      return undefined
    }
    if (!isAuthenticated) {
      setFetchedCode(null)
      return undefined
    }
    let cancelled = false
    setCodeLoading(true)
    referralService
      .getMyCode()
      .then((res) => {
        if (cancelled) return
        const d = unwrapReferralResponse(res)
        setFetchedCode(normalizeReferralCode(d?.referralCode))
      })
      .catch(() => {
        if (!cancelled) setFetchedCode(null)
      })
      .finally(() => {
        if (!cancelled) setCodeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [referralCodeProp, isAuthenticated, user?.referralCode, user?.referral_code])

  const code =
    normalizeReferralCode(referralCodeProp) ??
    fetchedCode ??
    normalizeReferralCode(user?.referralCode ?? user?.referral_code)

  const referralLink = useMemo(() => {
    if (!code) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return buildReferralLink(origin || 'https://example.com', code)
  }, [code])

  const shareText = useMemo(
    () => `Join me and we both save! ${referralLink}`,
    [referralLink]
  )

  const openShare = (href) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const shareActions = [
    {
      key: 'whatsapp',
      label: 'Share on WhatsApp',
      className: 'bg-[#25D366] hover:opacity-90',
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      key: 'facebook',
      label: 'Share on Facebook',
      className: 'bg-[#1877F2] hover:opacity-90',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    },
    {
      key: 'twitter',
      label: 'Share on X',
      className: 'bg-[#000000] hover:opacity-90',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      key: 'telegram',
      label: 'Share on Telegram',
      className: 'bg-[#26A5E4] hover:opacity-90',
      href: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      key: 'linkedin',
      label: 'Share on LinkedIn',
      className: 'bg-[#0A66C2] hover:opacity-90',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    },
  ]

 
  return (
    <div className="font-inter flex w-full min-w-0 max-w-full flex-col items-center overflow-x-hidden text-center px-3 pt-0 pb-4 sm:px-5 sm:pt-0 sm:pb-6">
      <div className="relative flex w-full min-w-0 justify-center overflow-x-hidden">
        <div
          className="relative ml-[12vw] sm:ml-[14vw] md:ml-[8vw] lg:ml-[7vw] xl:ml-[6vw] 2xl:ml-[5vw] flex w-full max-w-[15rem] min-w-0 items-center justify-center overflow-hidden bg-contain bg-center bg-no-repeat aspect-[1024/430] sm:max-w-[16.5rem] md:max-w-[18rem] lg:max-w-[19.5rem] xl:max-w-[21rem] 2xl:max-w-[22.5rem]"
          style={{ backgroundImage: `url(${bgImg})` }}
        >
          <span className="-translate-x-7 -translate-y-4 text-lg font-bold tracking-tight text-white sm:-translate-x-5 sm:-translate-y-5 sm:text-xl md:-translate-x-8 md:-translate-y-5 md:text-2xl lg:-translate-x-9 lg:-translate-y-6 lg:text-2xl xl:-translate-x-11 xl:-translate-y-7 xl:text-3xl 2xl:-translate-x-12 2xl:-translate-y-8 2xl:text-3xl">
            {rewardLabel}
          </span>

         
        </div>
      </div>

      <h3
        id="refer-earn-modal-title"
        className="mb-3 font-serif font-bold tracking-tight text-black"
      >
        <span className="block text-2xl leading-tight sm:text-3xl">REFER</span>
        <span className="block py-0.5 font-serif text-2xl italic leading-none sm:text-3xl">
          &
        </span>
        <span className="block text-2xl leading-tight sm:text-3xl">EARN</span>
      </h3>
      <p className="mb-3 max-w-[14rem] text-[9px] font-medium uppercase leading-snug tracking-[0.12em] text-neutral-500 sm:max-w-none sm:text-[10px] sm:tracking-[0.14em]">
        <span className="block">Each time you refer get</span>
        <span className="mt-0.5 block">
          <span className="font-semibold text-neutral-900">cash</span> in your wallet
        </span>
      </p>

      <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-neutral-700">
        Your referral code
      </p>
      {codeLoading && (
        <p className="mb-2.5 text-[11px] text-neutral-500">Loading your code…</p>
      )}
      {!codeLoading && !code && isAuthenticated && (
        <p className="mb-2.5 text-xs text-neutral-600">
          Your referral code will appear here after it&apos;s assigned to your account.
        </p>
      )}
      {!codeLoading && !code && !isAuthenticated && (
        <p className="mb-2.5 text-xs text-neutral-600">Log in to get your personal referral link.</p>
      )}
      {code && (
        <p className="mb-3 max-w-full break-words px-0.5 font-serif text-xl font-bold uppercase text-black sm:text-2xl">
          {splitCodeForDisplay(code)}
        </p>
      )}

      <label className="sr-only" htmlFor="referral-link-modal">
        Referral link
      </label>
      <input
        id="referral-link-modal"
        type="url"
        readOnly
        value={referralLink}
        placeholder={code ? '' : 'Your link will appear when you have a code'}
        className="mb-2.5 w-full min-w-0 max-w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-center text-[11px] text-neutral-600 outline-none focus:border-black focus:ring-1 focus:ring-black"
      />

      <p className="mb-3 text-[10px] leading-relaxed text-neutral-500">
        By submitting you accept our{' '}
        <Link
          to="/terms-conditions"
          className="font-semibold text-neutral-800 underline-offset-2 hover:underline"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          to="/privacy-policy"
          className="font-semibold text-neutral-800 underline-offset-2 hover:underline"
        >
          Privacy Policy
        </Link>
      </p>

      <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {shareActions.map(({ key, label, className, href }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            disabled={!referralLink}
            onClick={() => referralLink && openShare(href)}
            className={`flex size-9 items-center justify-center rounded-lg text-white shadow-sm transition sm:size-10 ${className} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {key === 'whatsapp' && <FaWhatsapp className="size-4" />}
            {key === 'facebook' && <FaFacebookF className="size-3.5" />}
            {key === 'twitter' && <FaXTwitter className="size-3.5" />}
            {key === 'telegram' && <FaTelegramPlane className="size-4" />}
            {key === 'linkedin' && <FaLinkedinIn className="size-3.5" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ReferEarnModal({ open, onClose, referralCode: referralCodeProp = null }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
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
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-x-hidden p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refer-earn-modal-title"
    >
      <div
        className="relative z-10 flex min-h-[76vh] max-h-[110vh] w-full max-w-[min(100%,26.5rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 sm:min-h-[80vh] sm:max-w-[28.5rem]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-2 top-2 z-30 rounded-full bg-white/90 p-1.5 text-neutral-800 shadow-md ring-1 ring-black/10 backdrop-blur-sm transition hover:bg-white hover:text-black sm:left-2.5 sm:top-2.5 sm:p-2"
          aria-label="Close dialog"
        >
          <X className="size-[1.125rem] sm:size-4" strokeWidth={2} />
        </button>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <ReferEarnContent compact referralCodeProp={referralCodeProp} />
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Opens Refer & Earn each time the user opens/refreshes the site (MainLayout mounts).
 * Closing only hides it until the next full load.
 */
export default function ReferEarnOnVisitModal() {
  const [open, setOpen] = useState(true)

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return <ReferEarnModal open={open} onClose={handleClose} />
}
