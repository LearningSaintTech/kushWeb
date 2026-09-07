import { useCallback, useEffect, useMemo, useState } from 'react'
import { CREATOR_DASHBOARD, DESIGNER_DASHBOARD } from '../../data/mockCreator'
import { useAuth } from '../../../../app/context/AuthContext.jsx'
import { communityService } from '../../../../services/community.service.js'
import {
  earningsService,
  unwrapEarningsResponse,
} from '../../../../services/earnings.service.js'
import { isAppEnvDev } from '../../../../utils/logLevel.js'
import { debugError, debugLog } from '../../../../utils/debugLog.js'
import { mapCommunityDashboardMetrics } from './communityMetricsMappers'
import {
  formatEarningsInr,
  mapCommissionsToEarningsPerPost,
  mapSummaryToDashboardEarnings,
  normalizePayoutItems,
  payoutStatusMeta,
  resolveRoleAvailableBalance,
  resolveRoleDisplayedEarnings,
  resolveRoleDisplayedPending,
  resolveRolePaidOut,
  sumCommissionAmounts,
  sumPendingCommissionAmounts,
} from './earningsMappers'
import CreatorSettingsDrawer from './CreatorSettingsDrawer'
import EarningsPayoutDrawer from './EarningsPayoutDrawer'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import RegistrationWizard from '../../registration/RegistrationWizard'
import designerBannerImg from '../../../../assets/images/community/designer.png'

function FeatherIllustration({ className = 'h-14 w-14 sm:h-16 sm:w-16' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M85 15 C60 40, 35 65, 15 85" strokeWidth="2.5" />
      <path d="M85 15 C75 10, 50 20, 30 45 C20 58, 16 72, 15 85 C28 84, 42 80, 55 70 C80 50, 90 25, 85 15 Z" />
      <path d="M72 25 C62 25, 52 30, 48 35" />
      <path d="M60 36 C50 38, 42 45, 38 50" />
      <path d="M48 48 C40 52, 34 58, 30 65" />
      <path d="M78 30 C72 38, 65 44, 58 48" />
      <path d="M68 42 C60 50, 52 56, 45 60" />
      <path d="M56 54 C48 62, 40 68, 35 72" />
    </svg>
  )
}

function PenToolIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function WarningTriangleIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  )
}

function BecomeDesignerModal({ open, onClose, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="relative w-full max-w-[490px] rounded-[1.75rem] bg-[#FFF5F5] p-6 sm:p-8 shadow-2xl border border-red-100/90 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-black"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-black">
            <WarningTriangleIcon className="h-7 w-7 text-black" />
          </div>
          <h2 className="font-inter text-2xl font-bold tracking-tight text-black">
            Important Notice
          </h2>
        </div>

        <p className="mt-4 font-inter text-base leading-relaxed text-neutral-800">
          Once you become a Designer, you cannot return to your Creator profile. This action requires permanent account deletion if you wish to revert. Please consider carefully before proceeding.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-inter text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-black px-6 py-2.5 font-inter text-xs font-semibold text-white shadow-md transition hover:bg-neutral-800"
          >
            Become a Designer
          </button>
        </div>
      </div>
    </div>
  )
}

function resolveDashboardUserId(authUser, profile) {
  return (
    authUser?._id ||
    authUser?.id ||
    authUser?.userId ||
    profile?.userId ||
    profile?.user?._id ||
    profile?.user?.id ||
    profile?._id ||
    profile?.id ||
    null
  )
}

/**
 * Shared profile dashboard — same layout for creator & designer feed profiles.
 * Metrics: GET /community/stats (+ /profile/me fallback) for Likes / Views / Posts.
 * Earnings are role-scoped via `role=creator|designer` when VITE_APP_ENV=dev.
 */
export default function DesignerDashboard({
  mode = 'designer',
  onModeChange,
  onBecomeDesigner,
}) {
  const { user: authUser } = useAuth()
  const role = mode === 'designer' ? 'designer' : 'creator'
  const mock = mode === 'creator' ? CREATOR_DASHBOARD : DESIGNER_DASHBOARD
  const liveEarningsEnabled = Boolean(authUser) || isAppEnvDev()

  const [communityStats, setCommunityStats] = useState(null)
  const [profileMe, setProfileMe] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState('')

  const [liveSummary, setLiveSummary] = useState(null)
  const [liveCommissions, setLiveCommissions] = useState(null)
  const [livePayouts, setLivePayouts] = useState([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  const { profile: communityContextProfile, selectRole } = useCommunityProfile()
  
  const rawDesignerStatus = String(
    communityContextProfile?.designerVerificationStatus ||
    profileMe?.designerVerificationStatus ||
    profileMe?.verificationStatus ||
    authUser?.designerVerificationStatus ||
    ''
  ).toLowerCase().trim()

  const isDesignerPending =
    rawDesignerStatus === 'pending' ||
    rawDesignerStatus === 'under_review' ||
    rawDesignerStatus === 'in_review' ||
    rawDesignerStatus === 'submitted'

  const isDesignerRejected =
    rawDesignerStatus === 'rejected' ||
    rawDesignerStatus === 'declined'

  const isDesignerApproved =
    rawDesignerStatus === 'verified' ||
    rawDesignerStatus === 'approved' ||
    Boolean(communityContextProfile?.isDesignerVerified || profileMe?.isDesignerVerified)

  const isUserDesigner = Boolean(
    isDesignerApproved ||
    isDesignerPending ||
    isDesignerRejected ||
    communityContextProfile?.isDesigner ||
    (Array.isArray(communityContextProfile?.roles) && communityContextProfile.roles.includes('designer')) ||
    profileMe?.isDesigner ||
    profileMe?.roles?.includes?.('designer') ||
    profileMe?.user?.isDesigner ||
    authUser?.isDesigner ||
    authUser?.is_designer ||
    authUser?.role === 'designer' ||
    (Array.isArray(authUser?.roles) && authUser.roles.includes('designer'))
  )

  const designerRejectionReason =
    communityContextProfile?.designerRejectionReason ||
    profileMe?.designerRejectionReason ||
    profileMe?.rejectionReason ||
    profileMe?.rejectReason ||
    authUser?.designerRejectionReason ||
    authUser?.rejectionReason ||
    ''

  const handleConfirmBecomeDesigner = async () => {
    setNoticeOpen(false)
    try {
      if (selectRole) {
        await selectRole('designer')
      } else {
        await communityProfileService.selectRole('designer')
      }
    } catch (e) {
      console.error('Failed to select designer role', e)
    }
    onBecomeDesigner?.()
    onModeChange?.('designer')
    setWizardOpen(true)
  }

  const userId = resolveDashboardUserId(authUser, profileMe)

  const loadCommunityMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError('')
    try {
      const [statsResult, profileResult] = await Promise.allSettled([
        communityService.getStats({ role }),
        communityService.getMyProfile({ postsLimit: 1, reelsLimit: 1, productsLimit: 1 }),
      ])

      const stats = statsResult.status === 'fulfilled' ? statsResult.value : null
      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null

      setCommunityStats(stats)
      setProfileMe(profile)

      if (statsResult.status === 'rejected' && profileResult.status === 'rejected') {
        const reason = statsResult.reason || profileResult.reason
        setMetricsError(
          reason?.response?.data?.message ||
            reason?.message ||
            'Could not load community stats.',
        )
      }

      debugLog('[Community] dashboard metrics', {
        userId: resolveDashboardUserId(authUser, profile),
        role,
        statsStatus: statsResult.status,
        profileStatus: profileResult.status,
        stats,
        profile,
      })
    } catch (err) {
      setCommunityStats(null)
      setProfileMe(null)
      setMetricsError(err?.message || 'Could not load community stats.')
      debugError('[Community] dashboard metrics failed', err?.message)
    } finally {
      setMetricsLoading(false)
    }
  }, [role, authUser])

  const loadLiveEarnings = useCallback(async () => {
    if (!liveEarningsEnabled) return
    setLiveLoading(true)
    setLiveError('')
    setLiveSummary(null)
    setLiveCommissions(null)
    setLivePayouts([])
    try {
      const [summaryResult, commissionsResult, payoutsResult] = await Promise.allSettled([
        earningsService.getSummary({ role }),
        earningsService.getCommissions({ page: 1, limit: 20, role }),
        earningsService.getPayouts({ page: 1, limit: 10, role }),
      ])

      const summary =
        summaryResult.status === 'fulfilled'
          ? unwrapEarningsResponse(summaryResult.value)
          : null
      const commissions =
        commissionsResult.status === 'fulfilled'
          ? unwrapEarningsResponse(commissionsResult.value)
          : null
      const payoutsPayload =
        payoutsResult.status === 'fulfilled'
          ? unwrapEarningsResponse(payoutsResult.value)
          : null

      setLiveSummary(summary)
      setLiveCommissions(commissions)
      setLivePayouts(
        payoutsResult.status === 'fulfilled'
          ? normalizePayoutItems(payoutsPayload)
          : [],
      )

      if (summaryResult.status === 'rejected') {
        const reason = summaryResult.reason
        setLiveError(
          reason?.response?.data?.message ||
            reason?.message ||
            'Could not load earnings summary.',
        )
      }

      const byRole = summary?.byRole?.[role] || null
      const snapshot = {
        userId: resolveDashboardUserId(authUser, profileMe),
        role,
        available: summary
          ? resolveRoleAvailableBalance(summary, role, 0)
          : null,
        pending: summary
          ? resolveRoleDisplayedPending(summary, role, 0)
          : null,
        earned: summary
          ? resolveRoleDisplayedEarnings(summary, role, 0)
          : null,
        paidOut: summary ? resolveRolePaidOut(summary, role) : null,
        walletAvailable: summary?.availableBalance ?? null,
        walletPending: summary?.pendingBalance ?? null,
        lifetimeEarned: summary?.lifetimeEarned ?? null,
        lifetimePaid: summary?.lifetimePaid ?? null,
        byRole,
        byRoleCreator: summary?.byRole?.creator ?? null,
        byRoleDesigner: summary?.byRole?.designer ?? null,
        rates: summary?.rates ?? null,
        counts: summary?.counts ?? null,
        minPayoutAmount: summary?.minPayoutAmount ?? null,
        commissionsCount: Array.isArray(commissions)
          ? commissions.length
          : commissions?.items?.length ??
            commissions?.commissions?.length ??
            summary?.commissions?.length ??
            summary?.recentCommissions?.length ??
            0,
        payoutsStatus: payoutsResult.status,
        summaryStatus: summaryResult.status,
        commissionsStatus: commissionsResult.status,
        rawSummary: summary,
      }

      console.log('[Dashboard] earnings snapshot', snapshot)
      debugLog('[Dashboard] earnings snapshot', snapshot)
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Could not load earnings.'
      setLiveError(String(msg))
      setLiveSummary(null)
      setLiveCommissions(null)
      setLivePayouts([])
      debugError('[Earnings] load failed', msg)
    } finally {
      setLiveLoading(false)
    }
  }, [liveEarningsEnabled, role, authUser, profileMe])

  useEffect(() => {
    loadCommunityMetrics()
  }, [loadCommunityMetrics])

  useEffect(() => {
    if (!liveEarningsEnabled) {
      setLiveSummary(null)
      setLiveCommissions(null)
      setLivePayouts([])
      setLiveError('')
      setLiveLoading(false)
      return undefined
    }
    loadLiveEarnings()
    return undefined
  }, [liveEarningsEnabled, loadLiveEarnings])

  useEffect(() => {
    if (!liveSummary && !profileMe && !userId) return
    const mapped = liveSummary
      ? mapSummaryToDashboardEarnings(liveSummary, role)
      : null
    const ui = {
      userId,
      role,
      available: mapped?.meta?.availableRaw ?? null,
      pending: mapped?.meta?.pendingRaw ?? null,
      paidOut: mapped?.meta?.paidOutRaw ?? null,
      earned: mapped?.meta?.earnedRaw ?? null,
      availableLabel: mapped?.meta?.available ?? null,
      pendingLabel: mapped?.meta?.pending ?? null,
      paidOutLabel: mapped?.meta?.paidOut ?? null,
      profileUsername: profileMe?.username ?? profileMe?.userName ?? null,
      liveLoading,
      liveError: liveError || null,
    }
    console.log('[Dashboard] UI balances', ui)
    debugLog('[Dashboard] UI balances', ui)
  }, [liveSummary, profileMe, userId, role, liveLoading, liveError])

  const data = useMemo(() => {
    const metrics = mapCommunityDashboardMetrics(communityStats, profileMe, role)
    const commissionsSource =
      sumCommissionAmounts(liveCommissions, role) > 0 ||
      (Array.isArray(liveCommissions) && liveCommissions.length > 0)
        ? liveCommissions
        : liveSummary || liveCommissions
    const commissionsTotal = sumCommissionAmounts(commissionsSource, role)
    const pendingFromCommissions = sumPendingCommissionAmounts(
      commissionsSource,
      role,
    )
    const mappedEarnings = liveEarningsEnabled
      ? mapSummaryToDashboardEarnings(liveSummary, role, {
          commissionsTotal,
          pendingFromCommissions,
        })
      : null
    const commissionRows = liveEarningsEnabled
      ? mapCommissionsToEarningsPerPost(
          commissionsSource,
          mock.earningsPerPost?.[0]?.image,
          role,
        )
      : []

    const defaultRate = role === 'designer' ? '1%' : '2.5%'
    const isCreator = role === 'creator'

    return {
      range: mock.range,
      earnings: mappedEarnings?.earnings ?? mock.earnings,
      summary: metrics?.chips ?? mock.summary,
      hasLiveMetrics: Boolean(metrics),
      earningsPerPost:
        commissionRows.length > 0 ? commissionRows : mock.earningsPerPost,
      hasLiveCommissions: commissionRows.length > 0,
      topPosts: mock.topPosts ?? [],
      meta: {
        earningsLabel: isCreator ? 'Total Earnings' : 'Designer Earnings',
        rateLabel: isCreator
          ? 'Affiliate Commission Rate'
          : 'Designer Royalty Rate',
        sourceLabel: isCreator
          ? 'Tagged Posts & Reels'
          : 'Design Catalog Sales',
        listTitle: isCreator
          ? 'Earnings Per Post'
          : 'Recent Design Royalties',
        emptyListText: isCreator
          ? 'No commissions earned yet from tagged posts.'
          : 'No royalties earned yet from design sales.',
        ...(mappedEarnings?.meta ?? {}),
        commissionRate:
          mappedEarnings?.meta?.commissionRate ??
          (liveEarningsEnabled ? defaultRate : null),
      },
      usingLiveEarnings: Boolean(mappedEarnings),
      payouts: livePayouts,
    }
  }, [
    communityStats,
    profileMe,
    liveEarningsEnabled,
    liveSummary,
    liveCommissions,
    livePayouts,
    mock,
    role,
  ])

  const topPosts = data.topPosts

  return (
    <aside className="scrollbar-hide w-full shrink-0 overflow-y-auto pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-inter text-lg font-bold text-black">Dashboard</h2>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-inter text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          {data.range}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {(isUserDesigner ? ['creator', 'designer'] : ['creator']).map((value) => {
            const active = mode === value
            const label =
              value === 'designer'
                ? isDesignerPending
                  ? 'Designer (Pending)'
                  : isDesignerRejected
                    ? 'Designer (Rejected)'
                    : 'Designer'
                : 'Creator'
            return (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange?.(value)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-inter text-[11px] font-medium capitalize transition ${
                  active
                    ? 'border-[#7C5CFF] bg-[#F3EEFF] text-[#7C5CFF]'
                    : 'border-[#D9D9D9] bg-white text-[#7A7A7A] hover:border-neutral-400'
                }`}
              >
                {label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={`${mode === 'designer' ? 'Designer' : 'Creator'} settings`}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 11v5.5" />
              <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      {/* Designer Application Status Banners */}
      {mode === 'designer' && isDesignerPending && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7]/60 to-[#FFFBEB] p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-inter text-sm font-bold text-amber-950">
                  Designer Profile Under Review
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 font-inter text-[10px] font-bold text-amber-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                  PENDING
                </span>
              </div>
              <p className="mt-0.5 font-inter text-xs text-amber-800/90">
                Your application has been submitted and is awaiting verification. You can review your submitted details anytime.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="shrink-0 self-start sm:self-auto cursor-pointer rounded-xl bg-amber-900 px-3.5 py-1.5 font-inter text-xs font-semibold text-white shadow-2xs transition hover:bg-black"
          >
            Review Details
          </button>
        </div>
      )}

      {mode === 'designer' && isDesignerRejected && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-gradient-to-r from-[#FFF5F5] via-[#FEE2E2]/50 to-[#FFF5F5] p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-inter text-sm font-bold text-red-950">
                    Designer Application Rejected
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-200/90 px-2 py-0.5 font-inter text-[10px] font-bold text-red-900">
                    REJECTED
                  </span>
                </div>
                {designerRejectionReason ? (
                  <div className="mt-2 rounded-xl border border-red-200/80 bg-white/90 p-2.5">
                    <p className="font-inter text-xs text-red-900">
                      <span className="font-bold text-red-950">Reason: </span>
                      {designerRejectionReason}
                    </p>
                  </div>
                ) : (
                  <p className="mt-0.5 font-inter text-xs text-red-800/90">
                    Your designer application did not meet verification criteria. You can update your details and re-apply.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="shrink-0 self-start sm:self-auto cursor-pointer rounded-xl bg-red-600 px-4 py-2 font-inter text-xs font-bold text-white shadow-2xs transition hover:bg-red-700"
            >
              Re-apply Now
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Dashboard Grid: Left (Hero Total Earnings + Banner) | Right (3 Stacked Metric Cards) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_130px] md:grid-cols-[1fr_145px] lg:grid-cols-[1fr_155px] items-stretch gap-3 sm:gap-4 lg:gap-5">
        {/* Left Column: Total Earnings Hero Card + Banner */}
        <div className="flex flex-col justify-between gap-3 sm:gap-4">
          {/* Total Earnings Hero Card */}
          <div className="flex flex-col justify-between rounded-[1.75rem] bg-[#F5F5F7] p-5 sm:p-6 shadow-xs">
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-inter text-xs font-semibold text-neutral-500">
                  Total Earnings
                </p>
                <span className="inline-flex items-center gap-1 font-inter text-xs font-semibold text-black">
                  <svg className="h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                  <span>{data.earnings?.change || '+12.4%'}</span>
                </span>
              </div>
              <p className="mt-2 font-inter text-3xl sm:text-4xl font-black tracking-tight text-black">
                {data.meta?.lifetimeEarned || data.earnings?.total || '₹0.00'}
              </p>
            </div>

            {/* Pill-sized Balances & Request Withdrawal Button */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-200/80 pt-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 font-inter text-xs font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Available: {data.meta?.available || '₹0.00'}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 font-inter text-xs font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Pending: {data.meta?.pending || '₹0.00'}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 font-inter text-xs font-medium text-neutral-600">
                Paid: {data.meta?.lifetimePaid || data.meta?.paidOut || '₹0.00'}
              </span>

              <button
                type="button"
                onClick={() => setPayoutOpen(true)}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 font-inter text-xs font-bold text-white shadow-xs transition hover:bg-neutral-800 hover:scale-105 active:scale-95"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Request Withdrawal</span>
              </button>
            </div>
          </div>

          {/* Become a Designer Banner / Mode Banner */}
          {role === 'creator' && !isUserDesigner ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setNoticeOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setNoticeOpen(true)
                }
              }}
              aria-label="Become a Designer"
              className="group relative flex h-[110px] sm:h-[120px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-[1.75rem] bg-black px-5 py-4 text-white shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
            >
              {/* Background designer.png */}
              <img
                src={designerBannerImg}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-85 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />

              {/* Left text */}
              <div className="relative z-10 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <PenToolIcon className="h-3.5 w-3.5 text-neutral-300" />
                  <span className="font-inter text-[11px] font-medium tracking-wide">
                    Become a
                  </span>
                </div>
                <h3 className="font-inter text-2xl sm:text-[28px] font-black uppercase tracking-wider text-white">
                  DESIGNER
                </h3>
              </div>

              {/* Right feather + chevron */}
              <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                <FeatherIllustration className="h-12 w-12 sm:h-16 sm:w-16 text-white/90 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
                <svg
                  className="h-4 w-4 text-neutral-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[110px] flex-col justify-center rounded-[1.75rem] bg-neutral-900 px-6 py-5 text-white">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-[#8B5CF6]/50 bg-[#8B5CF6]/20 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd]">
                  {mode === 'designer' ? 'Designer Mode' : 'Creator Mode'}
                </span>
              </div>
              <p className="mt-2 font-inter text-sm text-neutral-300">
                Earn commissions on every product sold through your tagged posts & reels.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: 3 Metric Cards (Likes, Views, Posts) */}
        <div className="flex shrink-0 flex-row sm:flex-col gap-3">
          {data.summary.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col justify-center rounded-[1.25rem] bg-[#F5F5F7] px-4 py-3.5 sm:py-4"
            >
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {item.label}
              </p>
              <p className="mt-1 font-inter text-xl sm:text-2xl font-bold leading-none text-black">
                {metricsLoading && !data.hasLiveMetrics ? '…' : item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Commissions / Earnings Per Post Section */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-inter text-base font-bold text-black">
              Earnings Per Post
            </h3>
            <p className="font-inter text-xs text-neutral-400">
              Orders and earnings from your tagged community content
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPayoutOpen(true)}
            className="cursor-pointer font-inter text-xs font-semibold text-neutral-600 transition hover:text-black"
          >
            Details →
          </button>
        </div>

        {data.earningsPerPost.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
            <p className="font-inter text-sm font-medium text-neutral-600">
              {data.meta?.emptyListText || 'No commissions earned yet.'}
            </p>
            <p className="mt-1 font-inter text-xs text-neutral-400">
              Tag products in your posts and reels to start earning affiliate commissions!
            </p>
          </div>
        ) : (
          <ul className="mt-3.5 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white p-2 shadow-xs">
            {data.earningsPerPost.map((row, index) => {
              const isPending = String(row.rawStatus || row.status).toLowerCase() === 'pending'
              const isCancelled = String(row.rawStatus || row.status).toLowerCase() === 'cancelled'
              return (
                <li key={row.id || index} className="flex items-center gap-3 sm:gap-4 p-3 hover:bg-neutral-50/80 rounded-xl transition">
                  <span className="w-4 shrink-0 font-inter text-xs font-semibold text-neutral-400 text-center">
                    {row.rank ?? index + 1}
                  </span>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100 border border-black/5">
                    {row.image ? (
                      <img src={row.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                        Item
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-inter text-sm sm:text-base font-semibold text-black">
                        {row.title}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-inter text-[10px] font-bold ${
                          isPending
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                            : isCancelled
                              ? 'bg-red-50 text-red-700 border border-red-200/80'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}
                      >
                        {row.status || 'Available'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-inter text-xs text-neutral-400">
                      {/* {row.orderId ? (
                        <span>Order: {row.orderId}</span>
                      ) : null}
                      {row.sku ? (
                        <span>SKU: {row.sku}</span>
                      ) : null} */}
                      {row.baseAmount ? (
                        <span>Sale: {row.baseAmount} {row.ratePct ? `(${row.ratePct})` : ''}</span>
                      ) : null}
                      {row.date ? (
                        <span>{row.date}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-inter text-sm sm:text-base font-bold ${
                      isCancelled ? 'text-neutral-400 line-through' : 'text-[#10B981]'
                    }`}>
                      {row.earnings}
                    </p>
                    <span className="font-inter text-[10px] text-neutral-400">
                      Commission
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Top Performing Posts (Commented out) */}
      {/* <section className="mt-8">
        <h3 className="font-inter text-base font-bold text-black mb-3.5">Top Performing Posts</h3>
        <div className="scrollbar-hide flex gap-3.5 overflow-x-auto pb-1">
          {topPosts.map((post) => (
            <article
              key={post.id}
              className="relative w-[130px] sm:w-[150px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100 shadow-sm"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-200">
                {post.image ? (
                  <img
                    src={post.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between px-1 pb-1">
                <span className="font-inter text-xs font-semibold text-neutral-500">
                  {post.views}
                </span>
                {post.earnings ? (
                  <span className="font-inter text-xs font-bold text-[#10B981]">
                    {post.earnings}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section> */}

      <CreatorSettingsDrawer
        open={settingsOpen}
        mode={mode}
        onClose={() => setSettingsOpen(false)}
      />
      <EarningsPayoutDrawer
        open={payoutOpen}
        mode={mode}
        onClose={() => setPayoutOpen(false)}
        onUpdated={loadLiveEarnings}
      />
      <BecomeDesignerModal
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        onConfirm={handleConfirmBecomeDesigner}
      />
      <RegistrationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </aside>
  )
}
