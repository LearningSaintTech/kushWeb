import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { couponsService } from '../../services/coupons.service.js'
import { ROUTES } from '../../utils/constants'
import couponIcon from '../../assets/images/coupon/coupon.png'

function formatExpiry(dateVal) {
  if (!dateVal) return null
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CopyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 8h8a2 2 0 002-2V10a2 2 0 00-2-2h-8a2 2 0 00-2 2v6a2 2 0 002 2z"
      />
    </svg>
  )
}

function CouponCard({
  coupon,
  reveal,
  onToggleReveal,
  onCopy,
}) {
  const code = (coupon?.code ?? '').toString()
  const title = (coupon?.description ?? coupon?.title ?? coupon?.name ?? 'EXTRA OFFER').toString()
  const minCart = coupon?.minCartValue ?? coupon?.minOrderValue ?? coupon?.minOrder ?? 0
  const expiry = formatExpiry(coupon?.expiryDate ?? coupon?.expiresAt ?? coupon?.expiry)
  const isActive = coupon?.isActive ?? coupon?.active ?? true

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center min-h-0">
        {/* Left: icon + details */}
        <div className="flex-1 px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded flex items-center justify-center shrink-0 p-1.5 sm:p-2 bg-gray-100 overflow-hidden">
            <img src={couponIcon} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-900 truncate">{title}</p>
            <p className="mt-0.5 text-[11px] sm:text-xs uppercase text-gray-700 break-words">
              MIN. ORDER OF ₹{Number(minCart || 0).toLocaleString('en-IN')} TO REDEEM,
            </p>
            {expiry && (
              <p className="mt-0.5 text-[11px] sm:text-xs text-gray-700">
                Expires {expiry}
              </p>
            )}
          </div>
        </div>

        {/* Right: status + action (dashed divider) */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 px-4 sm:pl-4 sm:pr-5 py-4 border-t sm:border-t-0 sm:border-l border-dashed border-gray-300 bg-gray-50/50 sm:bg-transparent">
          <span
            className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          {!reveal ? (
            <button
              type="button"
              onClick={onToggleReveal}
              className="w-full sm:w-auto shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-black text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors"
            >
              SHOW CODE
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 min-w-0 flex-1 sm:flex-initial max-w-full">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-black truncate min-w-0">
                {code || '—'}
              </span>
              <button
                type="button"
                onClick={onCopy}
                className="p-1 text-gray-600 hover:text-black rounded shrink-0"
                aria-label="Copy coupon code"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CouponsPage() {
  const { isAuthenticated } = useAuth()

  const [coupons, setCoupons] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [revealedId, setRevealedId] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)

  const limit = 6

  const fetchCoupons = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await couponsService.getAvailable({ page, limit })
      const data = res?.data?.data ?? res?.data

      const list = Array.isArray(data)
        ? data
        : (data?.items ?? data?.data ?? data?.coupons ?? [])
      const pag = data?.pagination ?? data?.meta ?? null

      const couponList = (Array.isArray(list) ? list : []).filter((c) => !c?.isInfluencer)
      console.log('Coupons response:', JSON.stringify(res?.data, null, 2))
      console.log('Coupon details:', JSON.stringify(couponList, null, 2))
      if (couponList.length > 0) console.table(couponList)

      setCoupons(couponList)
      setPagination(pag && typeof pag === 'object' ? pag : null)
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load coupons')
      setCoupons([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, page])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const totalPages = useMemo(() => {
    const tp = pagination?.totalPages ?? pagination?.pages
    return tp != null ? Number(tp) : null
  }, [pagination])

  const currentPage = useMemo(() => {
    const p = pagination?.page ?? page
    return p != null ? Number(p) : page
  }, [pagination, page])

  const canPrev = currentPage > 1
  const canNext = totalPages ? currentPage < totalPages : coupons.length === limit

  const pageNumbers = useMemo(() => {
    if (!totalPages) return []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + 4)
    const s2 = Math.max(1, end - 4)
    return Array.from({ length: end - s2 + 1 }, (_, i) => s2 + i)
  }, [totalPages, currentPage])

  const handleCopy = async (code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 1200)
    } catch {
      // ignore
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className=" px-4 sm:px-6 py-12 sm:py-16 text-center max-sm:pt-20">
          <h1 className="text-xl sm:text-2xl font-bold text-black uppercase">Coupons</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Please sign in to view your coupons.</p>
          <Link
            to={ROUTES.AUTH}
            className="mt-6 inline-block px-6 py-3 bg-black text-white text-sm font-medium uppercase hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className=" px-4 sm:px-6 md:px-8 max-sm:pt-6">
        <h1 className="text-lg sm:text-xl font-bold text-black uppercase mb-6">Coupons</h1>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-gray-500">No coupons available.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {coupons.map((c) => {
              const id = c?._id ?? c?.id ?? c?.code
              const code = (c?.code ?? '').toString()
              const reveal = revealedId != null && String(revealedId) === String(id)
              return (
                <CouponCard
                  key={id}
                  coupon={c}
                  reveal={reveal}
                  onToggleReveal={() => {
                    setRevealedId(reveal ? null : id)
                    setCopiedCode(null)
                  }}
                  onCopy={() => handleCopy(code)}
                />
              )
            })}
          </div>
        )}

        {/* Copied toast */}
        {copiedCode && (
          <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex justify-center">
            <div className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium max-w-[90vw] truncate">
              Copied {copiedCode}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && (totalPages ? totalPages > 1 : coupons.length === limit) && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-w-20 sm:min-w-24 px-3 sm:px-4 py-2 rounded-full border border-gray-300 text-xs sm:text-sm disabled:opacity-50"
            >
              Prev
            </button>

            {pageNumbers.length > 0 ? (
              pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full text-xs sm:text-sm font-medium ${
                    n === currentPage ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))
            ) : (
              <span className="text-xs sm:text-sm text-gray-500 px-2">Page {currentPage}</span>
            )}

            <button
              type="button"
              disabled={!canNext || (totalPages != null && currentPage >= totalPages)}
              onClick={() => setPage((p) => p + 1)}
              className="min-w-20 sm:min-w-24 px-3 sm:px-4 py-2 rounded-full border border-gray-300 text-xs sm:text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

