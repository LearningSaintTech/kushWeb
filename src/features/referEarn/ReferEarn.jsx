import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReferEarnModal } from '../home/components/ReferEarn'
import { useAuth } from '../../app/context/AuthContext'
import { referralService, unwrapReferralResponse } from '../../services/referral.service.js'
import { ROUTES } from '../../utils/constants'

const HISTORY_LIMIT = 20

function formatMoney(value) {
  const amount = Number(value || 0)
  return `Rs ${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`
}

function formatHistoryDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function referredDisplayName(item) {
  const n = item?.referredUser?.name || item?.referredUserSnapshot?.name || ''
  const s = String(n).trim()
  return s || 'Friend'
}

function statusDisplay(item) {
  const st = String(item?.status || '').toUpperCase()
  if (st === 'REWARDED') {
    const amt = Number(item?.rewardAmount ?? 0)
    return { kind: 'amount', text: `+₹${Number.isFinite(amt) ? amt.toLocaleString('en-IN') : '0'}` }
  }
  if (st === 'REJECTED' || st === 'EXPIRED') {
    return { kind: 'muted', text: st === 'EXPIRED' ? 'Expired' : 'Declined' }
  }
  if (st === 'QUALIFIED') {
    return { kind: 'pending', text: 'Qualified' }
  }
  return { kind: 'pending', text: 'Invite Sent' }
}

const ReferEarn = () => {
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const [shareOpen, setShareOpen] = useState(false)

  const [dashboard, setDashboard] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadDashboardAndFirstPage = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [dashRes, histRes] = await Promise.all([
        referralService.getDashboard(),
        referralService.getHistory({ page: 1, limit: HISTORY_LIMIT }),
      ])
      const dash = unwrapReferralResponse(dashRes)
      const hist = unwrapReferralResponse(histRes)
      setDashboard(dash ?? null)
      const items = hist?.items ?? []
      setHistoryItems(items)
      setHistoryPage(1)
      setHasMoreHistory(items.length >= (hist?.limit ?? HISTORY_LIMIT))
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Could not load referral data.')
      setDashboard(null)
      setHistoryItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authChecked) return
    if (!isAuthenticated) {
      setDashboard(null)
      setHistoryItems([])
      setLoading(false)
      return
    }
    loadDashboardAndFirstPage()
  }, [authChecked, isAuthenticated, loadDashboardAndFirstPage])

  const loadMoreHistory = async () => {
    if (!isAuthenticated || historyLoadingMore || !hasMoreHistory) return
    const next = historyPage + 1
    setHistoryLoadingMore(true)
    try {
      const res = await referralService.getHistory({ page: next, limit: HISTORY_LIMIT })
      const hist = unwrapReferralResponse(res)
      const items = hist?.items ?? []
      setHistoryItems((prev) => [...prev, ...items])
      setHistoryPage(next)
      setHasMoreHistory(items.length >= (hist?.limit ?? HISTORY_LIMIT))
    } catch {
      setHasMoreHistory(false)
    } finally {
      setHistoryLoadingMore(false)
    }
  }

  const earnedBalance = Number(dashboard?.totalReferralEarnings ?? 0)
  const totalReferrals = Number(dashboard?.totalReferrals ?? 0)
  const referralCodeForModal = dashboard?.referralCode ?? null

  return (
    <div className="mx-auto mt-16 w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:mt-20 md:px-6">
      <h1 className="font-inter text-2xl font-semibold text-black sm:text-3xl">
        Refer and earn
      </h1>
      {!authChecked && (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      )}

      {authChecked && !isAuthenticated && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="font-inter text-sm">
            Log in to see your referral code, earnings, and invite history.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAuthModal(ROUTES.REFER_EARN)}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Log in / Sign up
            </button>
            <Link
              to={ROUTES.AUTH}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Open auth page
            </Link>
          </div>
        </div>
      )}

      {isAuthenticated && error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {isAuthenticated && loading && (
        <p className="mt-4 text-sm text-gray-500">Loading your referrals…</p>
      )}

      {isAuthenticated && !loading && (
        <>
          <section className="relative mt-4 overflow-hidden rounded-lg border border-[#d6d6d6] bg-black p-4 text-white shadow-[0_1px_6px_rgba(0,0,0,0.15)] sm:p-5 md:p-6">
            <div className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 right-10 h-24 w-24 rounded-full bg-white/5" />

            <div className="relative flex items-start justify-between gap-3 sm:gap-4">

              <div className="min-w-0 flex-1">
                <p className="font-inter text-[15px] font-medium uppercase tracking-[0.18em] text-white/90 sm:text-xs sm:tracking-[0.2em]">
                  Earned balance
                </p>
                <p className="mt-1.5 font-['Rubik'] text-3xl ...">
                  {formatMoney(earnedBalance).toUpperCase()}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-1 font-inter text-xs text-white/120 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:text-sm">
                  <span className="whitespace-nowrap">
                    Total referrals {Number.isFinite(totalReferrals) ? totalReferrals : 0}
                  </span>

                  <span className="whitespace-nowrap text-white/120">
                    Rewarded {dashboard?.rewardedCount ?? 0}
                  </span>

                  <span className="whitespace-nowrap text-white/120">
                    Pending {dashboard?.pendingCount ?? 0}
                  </span>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 60 48"
                fill="none"
                className="h-11 w-auto shrink-0 aspect-[60/48] sm:h-14 md:h-16"
                aria-hidden
              >
                <path
                  d="M2.81285 29.8413C3.43781 29.3601 4.16562 29.03 4.93935 28.877C5.71308 28.7239 6.51173 28.7519 7.27284 28.9588L19.6003 31.7812C19.0681 30.8711 18.7876 29.8356 18.7878 28.7812C18.7878 27.1899 19.42 25.6638 20.5452 24.5386C21.6704 23.4134 23.1965 22.7812 24.7878 22.7812H37.3028C38.2225 22.7784 39.1336 22.9582 39.9833 23.3101C40.833 23.662 41.6044 24.179 42.2528 24.8312L48.2028 30.7812H55.7878C56.5835 30.7812 57.3466 31.0973 57.9092 31.6599C58.4718 32.2225 58.7878 32.9856 58.7878 33.7812V43.7812C58.7878 44.5769 58.4718 45.34 57.9092 45.9026C57.3466 46.4652 56.5835 46.7812 55.7878 46.7812H29.7878C29.7036 46.7818 29.6196 46.7717 29.5378 46.7512L13.5378 42.7513C13.4868 42.7378 13.4367 42.7211 13.3878 42.7012L3.68284 38.5662L3.62784 38.5412C2.84591 38.1504 2.17634 37.5669 1.6822 36.8458C1.18805 36.1247 0.885593 35.2897 0.803314 34.4194C0.721035 33.5491 0.861649 32.6722 1.2119 31.8713C1.56215 31.0703 2.11052 30.3717 2.80534 29.8413H2.81285ZM56.7878 43.7812V33.7812C56.7878 33.516 56.6825 33.2617 56.4949 33.0741C56.3074 32.8866 56.0531 32.7812 55.7878 32.7812H48.7878V44.7812H55.7878C56.0531 44.7812 56.3074 44.6759 56.4949 44.4884C56.6825 44.3008 56.7878 44.0465 56.7878 43.7812ZM4.50534 36.7388L14.1078 40.8312L29.9103 44.7812H46.7878V32.1963L40.8378 26.2463C40.3748 25.7804 39.8239 25.411 39.2171 25.1595C38.6103 24.908 37.9597 24.7795 37.3028 24.7812H24.7878C23.727 24.7812 22.7096 25.2027 21.9594 25.9528C21.2093 26.703 20.7878 27.7204 20.7878 28.7812C20.7878 29.8421 21.2093 30.8595 21.9594 31.6097C22.7096 32.3598 23.727 32.7812 24.7878 32.7812H31.7878C32.0531 32.7812 32.3074 32.8866 32.4949 33.0741C32.6825 33.2617 32.7878 33.516 32.7878 33.7812C32.7878 34.0465 32.6825 34.3008 32.4949 34.4884C32.3074 34.6759 32.0531 34.7812 31.7878 34.7812H23.7878C23.7121 34.7815 23.6367 34.7731 23.5628 34.7562L6.81285 30.9038H6.77284C6.02229 30.7047 5.22467 30.79 4.5331 31.1431C3.84154 31.4962 3.30475 32.0923 3.0258 32.8169C2.74685 33.5416 2.74538 34.3437 3.02168 35.0694C3.29798 35.7951 3.83257 36.3931 4.52284 36.7487L4.50534 36.7388ZM18.7878 16.7812C18.05 16.7824 17.3155 16.6814 16.6053 16.4813C16.265 18.0482 15.4618 19.4767 14.2997 20.5814C13.1376 21.6862 11.6703 22.4163 10.0882 22.677C8.5061 22.9377 6.88216 22.7169 5.42705 22.0434C3.97194 21.3698 2.75282 20.2746 1.9278 18.8997C1.10279 17.5248 0.709961 15.9337 0.800282 14.3328C0.890606 12.7319 1.45991 11.1951 2.43435 9.9217C3.40878 8.64832 4.74337 7.69714 6.26501 7.19154C7.78664 6.68595 9.42511 6.64926 10.9678 7.08625C11.2877 5.611 12.0184 4.25634 13.0755 3.17878C14.1326 2.10122 15.4731 1.34474 16.9419 0.996743C18.4108 0.648742 19.9481 0.723421 21.3763 1.21215C22.8046 1.70088 24.0654 2.58372 25.0131 3.75867C25.9608 4.93361 26.5567 6.35272 26.7321 7.85202C26.9074 9.35132 26.655 10.8696 26.0039 12.2316C25.3529 13.5935 24.3298 14.7434 23.0529 15.5485C21.776 16.3536 20.2974 16.7809 18.7878 16.7812ZM2.78785 14.7813C2.78785 15.9679 3.13973 17.128 3.79902 18.1147C4.45831 19.1014 5.39539 19.8704 6.49174 20.3245C7.5881 20.7787 8.7945 20.8975 9.95839 20.666C11.1223 20.4345 12.1914 19.863 13.0305 19.0239C13.8696 18.1848 14.441 17.1157 14.6726 15.9518C14.9041 14.7879 14.7852 13.5815 14.3311 12.4852C13.877 11.3888 13.108 10.4517 12.1213 9.79243C11.1346 9.13314 9.97453 8.78125 8.78784 8.78125C7.19654 8.78125 5.67042 9.41339 4.5452 10.5386C3.41999 11.6638 2.78785 13.19 2.78785 14.7813ZM18.7878 2.78125C17.3498 2.7811 15.9595 3.29745 14.8702 4.23627C13.7809 5.17509 13.065 6.47392 12.8528 7.89625C14.0017 8.57224 14.9634 9.52457 15.6506 10.6667C16.3378 11.8089 16.7287 13.1046 16.7878 14.4363C17.6118 14.7284 18.4897 14.837 19.3601 14.7544C20.2304 14.6718 21.0722 14.4 21.8265 13.958C22.5808 13.516 23.2294 12.9144 23.7269 12.1955C24.2244 11.4766 24.5588 10.6577 24.7066 9.79602C24.8545 8.93435 24.8123 8.05078 24.5829 7.20714C24.3535 6.3635 23.9426 5.58018 23.3788 4.91199C22.815 4.2438 22.112 3.7069 21.319 3.33884C20.526 2.97079 19.6621 2.78049 18.7878 2.78125Z"
                  fill="white"
                  stroke="white"
                  strokeWidth={1.56098}
                />
              </svg>
            </div>

            <div className="relative mt-6 flex justify-center sm:justify-end">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="font-inter h-14 w-full max-w-[270px] rounded-xl bg-white px-6 text-base font-normal uppercase  text-black transition-colors hover:bg-gray-100 sm:h-16 sm:text-xl md:h-15 md:max-w-[270px] md:text-2xl"
              >
                Refer and earn
              </button>
            </div>
          </section>

          <section className="relative mt-4 overflow-hidden rounded-lg border border-[#9A9A9A] text-black p-4 sm:p-5 md:p-6">
            <ul className="font-inter space-y-2 text-base leading-relaxed text-[#000000]">
              <li>&middot; Khush wallet balance can be used for purchase across all khush products</li>
              <li>&middot; The entered amount will be deducted from your wallet balance. Any remaining amount can be paid using other payment methods.</li>
            </ul>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="font-inter text-2xl font-semibold text-[#130138] sm:text-3xl md:text-4xl">
                Your History
              </h2>
              <span className="font-inter text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                Status
              </span>
            </div>

            {historyItems.length === 0 && (
              <p className="font-inter mt-4 text-sm text-gray-500">
                No referrals yet. Share your code to get started.
              </p>
            )}

            <div className="mt-4 space-y-4">
              {historyItems.map((item) => {
                const name = referredDisplayName(item)
                const sd = statusDisplay(item)
                const dt = formatHistoryDate(item?.createdAt)

                return (
                  <article
                    key={item?._id ?? `${name}-${dt}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#e8e8e8] bg-white px-3 py-4 shadow-[0_1px_6px_rgba(0,0,0,0.06)] sm:gap-4 sm:px-5 md:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-inter max-w-[170px] truncate text-base font-bold uppercase text-black sm:max-w-none sm:text-lg">
                        {name}
                      </p>
                      <p className="font-['Poppins'] text-sm text-[#000000]">{dt}</p>
                    </div>
                    <div className="shrink-0 text-right ">
                      {sd.kind === 'amount' && (
                        <p className="font-['Rubik'] text-2xl font-medium text-[#4f9428] sm:text-3xl">{sd.text}</p>
                      )}
                      {sd.kind === 'pending' && (
                        <p className="font-inter text-lg font-semibold text-amber-600 sm:text-xl">{sd.text}</p>
                      )}
                      {sd.kind === 'muted' && (
                        <p className="font-inter text-sm font-medium text-gray-500">{sd.text}</p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {hasMoreHistory && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreHistory}
                  disabled={historyLoadingMore}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {historyLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <ReferEarnModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        referralCode={referralCodeForModal}
      />
    </div>
  )
}

export default ReferEarn
