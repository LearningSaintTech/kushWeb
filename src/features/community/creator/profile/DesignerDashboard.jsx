import { useCallback, useEffect, useMemo, useState } from 'react'
import { CREATOR_DASHBOARD, DESIGNER_DASHBOARD } from '../../data/mockCreator'
import { communityService } from '../../../../services/community.service.js'
import {
  earningsService,
  unwrapEarningsResponse,
} from '../../../../services/earnings.service.js'
import { isAppEnvDev } from '../../../../utils/logLevel.js'
import { debugError, debugLog } from '../../../../utils/debugLog.js'
import { mapCommunityDashboardMetrics } from './communityMetricsMappers'
import {
  mapCommissionsToEarningsPerPost,
  mapSummaryToDashboardEarnings,
  normalizePayoutItems,
  payoutStatusMeta,
} from './earningsMappers'
import CreatorSettingsDrawer from './CreatorSettingsDrawer'
import EarningsPayoutDrawer from './EarningsPayoutDrawer'

/**
 * Shared profile dashboard — same layout for creator & designer feed profiles.
 * Metrics: GET /community/stats (+ /profile/me fallback) for Likes / Views / Posts.
 * Earnings APIs only when VITE_APP_ENV=dev.
 */
export default function DesignerDashboard({ mode = 'designer', onModeChange }) {
  const mock = mode === 'creator' ? CREATOR_DASHBOARD : DESIGNER_DASHBOARD
  const liveEarningsEnabled = isAppEnvDev()

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

  const loadCommunityMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError('')
    try {
      const [statsResult, profileResult] = await Promise.allSettled([
        communityService.getStats(),
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
        statsStatus: statsResult.status,
        profileStatus: profileResult.status,
        stats,
      })
    } catch (err) {
      setCommunityStats(null)
      setProfileMe(null)
      setMetricsError(err?.message || 'Could not load community stats.')
      debugError('[Community] dashboard metrics failed', err?.message)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  const loadLiveEarnings = useCallback(async () => {
    if (!liveEarningsEnabled) return
    setLiveLoading(true)
    setLiveError('')
    try {
      const [summaryResult, commissionsResult, payoutsResult] = await Promise.allSettled([
        earningsService.getSummary(),
        earningsService.getCommissions({ page: 1, limit: 20 }),
        earningsService.getPayouts({ page: 1, limit: 10 }),
      ])

      if (summaryResult.status === 'fulfilled') {
        setLiveSummary(unwrapEarningsResponse(summaryResult.value))
      } else {
        setLiveSummary(null)
      }

      if (commissionsResult.status === 'fulfilled') {
        setLiveCommissions(unwrapEarningsResponse(commissionsResult.value))
      } else {
        setLiveCommissions(null)
      }

      if (payoutsResult.status === 'fulfilled') {
        const payoutsPayload = unwrapEarningsResponse(payoutsResult.value)
        setLivePayouts(normalizePayoutItems(payoutsPayload))
      } else {
        setLivePayouts([])
      }

      if (summaryResult.status === 'rejected') {
        const reason = summaryResult.reason
        setLiveError(
          reason?.response?.data?.message ||
            reason?.message ||
            'Could not load earnings summary.',
        )
      }

      debugLog('[Earnings] load settled', {
        summary: summaryResult.status,
        commissions: commissionsResult.status,
        payouts: payoutsResult.status,
      })
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
  }, [liveEarningsEnabled])

  useEffect(() => {
    loadCommunityMetrics()
  }, [mode, loadCommunityMetrics])

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
  }, [liveEarningsEnabled, mode, loadLiveEarnings])

  const data = useMemo(() => {
    const metrics = mapCommunityDashboardMetrics(communityStats, profileMe)
    const mappedEarnings = liveEarningsEnabled
      ? mapSummaryToDashboardEarnings(liveSummary, mode)
      : null
    const commissionRows = liveEarningsEnabled
      ? mapCommissionsToEarningsPerPost(
          liveCommissions,
          mock.earningsPerPost?.[0]?.image,
        )
      : []

    const defaultRate = mode === 'designer' ? '1%' : '2.5%'

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
    mode,
  ])

  const topPosts = data.topPosts
  const showBreakdown =
    data.earnings?.creator != null || data.earnings?.royalties != null

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
          {['creator', 'designer'].map((value) => {
            const active = mode === value
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
                {value}
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

      {metricsError || liveEarningsEnabled || data.hasLiveMetrics ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.hasLiveMetrics ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Live stats
            </span>
          ) : null}
          {metricsLoading ? (
            <span className="font-inter text-[11px] text-neutral-400">Loading metrics…</span>
          ) : null}
          {metricsError ? (
            <button
              type="button"
              onClick={loadCommunityMetrics}
              className="cursor-pointer font-inter text-[11px] font-medium text-red-600 underline"
            >
              {metricsError} — Retry
            </button>
          ) : null}
          {liveEarningsEnabled ? (
            <>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Dev earnings API
              </span>
              {liveLoading ? (
                <span className="font-inter text-[11px] text-neutral-400">Loading earnings…</span>
              ) : null}
              {liveError ? (
                <button
                  type="button"
                  onClick={loadLiveEarnings}
                  className="cursor-pointer font-inter text-[11px] font-medium text-red-600 underline"
                >
                  {liveError} — Retry
                </button>
              ) : null}
              {data.usingLiveEarnings && !liveLoading && !liveError ? (
                <span className="font-inter text-[11px] text-emerald-600">Live summary</span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-stretch gap-3">
        <div className="flex min-w-0 flex-[1.7] flex-col rounded-[1.25rem] bg-[#EFEFEF] p-4 sm:p-5">
          <p className="font-inter text-xs font-medium text-neutral-500">Total Earnings</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <p className="font-inter text-[1.75rem] font-bold leading-none tracking-tight text-black">
              {liveLoading && liveEarningsEnabled && !data.usingLiveEarnings
                ? '…'
                : data.earnings.total}
            </p>
            {data.earnings.change && data.earnings.change !== '—' ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 font-inter text-[11px] font-semibold text-emerald-600">
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M8 12V4M8 4L4.5 7.5M8 4l3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {data.earnings.change}
              </span>
            ) : null}
          </div>
          {data.meta?.available || data.meta?.pending || data.meta?.commissionRate ? (
            <div className="mt-3 flex flex-wrap gap-3 font-inter text-[11px] text-neutral-500">
              {data.meta.available ? (
                <span>
                  Available{' '}
                  <span className="font-semibold text-black">{data.meta.available}</span>
                </span>
              ) : null}
              {data.meta.pending ? (
                <span>
                  Pending{' '}
                  <span className="font-semibold text-black">{data.meta.pending}</span>
                </span>
              ) : null}
              {data.meta.commissionRate ? (
                <span>
                  Rate{' '}
                  <span className="font-semibold text-black">{data.meta.commissionRate}</span>
                  <span className="text-neutral-400">
                    {mode === 'designer' ? ' royalty' : ' commission'}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
          {showBreakdown ? (
            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-black/10 pt-3.5 font-inter text-xs text-neutral-500">
              <p>
                Creator Earnings
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.creator}
                </span>
              </p>
              <p>
                Design Royalties
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.royalties}
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-auto border-t border-black/10 pt-3.5 font-inter text-xs text-neutral-500">
              <p>
                Creator Earnings
                <span className="mt-0.5 block font-semibold text-black">
                  {data.earnings.total}
                </span>
              </p>
            </div>
          )}
          {liveEarningsEnabled ? (
            <button
              type="button"
              onClick={() => setPayoutOpen(true)}
              className="mt-4 w-full cursor-pointer rounded-xl bg-black py-2.5 font-inter text-xs font-bold text-white transition hover:bg-neutral-800"
            >
              Request Withdraw
            </button>
          ) : null}
        </div>

        <div className="flex w-[100px] shrink-0 flex-col gap-2.5 sm:w-[110px]">
          {data.summary.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col justify-center rounded-[1.15rem] bg-[#EFEFEF] px-3 py-2.5"
            >
              <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                {item.label}
              </p>
              <p className="mt-1 font-inter text-lg font-bold leading-none text-black">
                {metricsLoading && !data.hasLiveMetrics ? '…' : item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-inter text-sm font-bold text-black">
            {data.hasLiveCommissions ? 'Commissions' : 'Earnings Per Post'}
          </h3>
          <button
            type="button"
            className="cursor-pointer font-inter text-xs font-medium text-neutral-400 transition hover:text-black"
          >
            Details
          </button>
        </div>
        <ul className="mt-3 divide-y divide-neutral-200/80">
          {data.earningsPerPost.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-0">
              <span className="w-3.5 shrink-0 font-inter text-xs font-semibold text-neutral-400">
                {row.rank ?? index + 1}
              </span>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                {row.image ? (
                  <img src={row.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-inter text-sm font-semibold text-black">{row.title}</p>
                <p className="font-inter text-xs text-neutral-400">{row.views}</p>
              </div>
              <p className="shrink-0 font-inter text-sm font-semibold text-emerald-600">
                {row.earnings}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {liveEarningsEnabled && data.payouts.length > 0 ? (
        <section className="mt-7">
          <h3 className="font-inter text-sm font-bold text-black">Payouts</h3>
          <ul className="mt-3 divide-y divide-neutral-200/80">
            {data.payouts.slice(0, 5).map((payout, index) => {
              const amount =
                payout.amount ?? payout.netAmount ?? payout.payoutAmount ?? 0
              const meta = payoutStatusMeta(payout.status)
              const when = payout.createdAt || payout.paidAt || payout.updatedAt
              return (
                <li
                  key={String(payout._id ?? payout.id ?? `p-${index}`)}
                  className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-inter text-sm font-semibold text-black">
                      ₹
                      {Number(amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="font-inter text-xs text-neutral-400">
                      {when
                        ? new Date(when).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-inter text-[10px] font-semibold ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-7">
        <h3 className="font-inter text-sm font-bold text-black">Top Performing Posts</h3>
        <div className="scrollbar-hide mt-3 flex gap-2.5 overflow-x-auto pb-0.5">
          {topPosts.map((post) => (
            <article
              key={post.id}
              className="relative w-[96px] shrink-0 overflow-hidden rounded-xl sm:w-[104px]"
            >
              <div className={`aspect-[4/5] ${post.style}`}>
                {post.image ? (
                  <img
                    src={post.image}
                    alt=""
                    className="h-full w-full object-cover mix-blend-overlay"
                  />
                ) : null}
              </div>
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 font-inter text-[9px] font-semibold leading-none text-white">
                {post.views ?? post.earnings ?? post.place}
              </span>
            </article>
          ))}
        </div>
      </section>

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
    </aside>
  )
}
