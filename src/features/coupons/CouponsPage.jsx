import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { couponsService } from '../../services/coupons.service.js'
import { ROUTES } from '../../utils/constants'

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
  const title = (coupon?.title ?? coupon?.name ?? 'EXTRA OFFER').toString()
  const minCart = coupon?.minCartValue ?? coupon?.minOrderValue ?? coupon?.minOrder ?? 0
  const expiry = formatExpiry(coupon?.expiryDate ?? coupon?.expiresAt ?? coupon?.expiry)
  const isActive = coupon?.isActive ?? coupon?.active ?? true

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-md overflow-hidden">
      <div className="flex">
        {/* Left content */}
        <div className="flex-1 px-6 py-5 flex items-center gap-4">
          <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-black">%</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-black truncate">{title}</p>
            <p className="mt-1 text-[11px] uppercase text-gray-500">
              MIN. ORDER OF ₹{Number(minCart || 0).toLocaleString('en-IN')} TO REDEEM,
            </p>
            {expiry && (
              <p className="mt-1 text-[11px] text-gray-500">
                Expires {expiry}
              </p>
            )}
          </div>
        </div>

        {/* Status pill (middle-ish like screenshot) */}
        <div className="px-4 py-5 flex items-start">
          <span
            className={`px-5 py-1 rounded-full text-[10px] font-semibold uppercase ${
              isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Right action */}
        <div className="w-[220px] px-6 py-5 flex items-center justify-center border-l border-dashed border-gray-300">
          {!reveal ? (
            <button
              type="button"
              onClick={onToggleReveal}
              className="px-8 py-2 rounded-full bg-black text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-gray-800 transition-colors"
            >
              Show code
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-black px-6 py-2">
              <span className="text-lg font-semibold tracking-wider text-black">
                {code || '—'}
              </span>
              <button
                type="button"
                onClick={onCopy}
                className="p-1 text-gray-700 hover:text-black"
                aria-label="Copy coupon code"
              >
                <CopyIcon className="h-5 w-5" />
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

      setCoupons(Array.isArray(list) ? list : [])
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
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Coupons</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your coupons.</p>
          <Link
            to={ROUTES.AUTH}
            className="mt-6 inline-block px-6 py-3 bg-black text-white uppercase hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-gray-500">No coupons available.</p>
        ) : (
          <div className="space-y-4">
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium">
              Copied {copiedCode}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && (totalPages ? totalPages > 1 : coupons.length === limit) && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-w-24 px-4 py-2 rounded-full border border-gray-300 text-sm disabled:opacity-50"
            >
              Prev
            </button>

            {pageNumbers.length > 0 ? (
              pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`h-10 w-10 rounded-full text-sm font-medium ${
                    n === currentPage ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))
            ) : (
              <span className="text-sm text-gray-500 px-2">Page {currentPage}</span>
            )}

            <button
              type="button"
              disabled={!canNext || (totalPages != null && currentPage >= totalPages)}
              onClick={() => setPage((p) => p + 1)}
              className="min-w-24 px-4 py-2 rounded-full border border-gray-300 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

