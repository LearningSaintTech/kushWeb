import { useState, useEffect, useCallback, useMemo } from 'react'
import { reviewsService } from '../../../services/reviews.service.js'
import { RiStarFill, RiStarHalfFill, RiStarLine } from 'react-icons/ri'
import ProductReviewImages from './ProductReviewImages'
import {
  getUrlFromMediaEntry,
  isVideoMediaEntry,
  isVideoUrlString,
} from '../../../utils/mediaUrl.js'

const PREVIEW_REVIEWS_LIMIT = 2
const LOAD_MORE_BATCH_SIZE = 8
const REVIEW_ACCENT = '#e07a5f'

function mergeReviewLists(existing, incoming) {
  const seen = new Set(
    existing.map((review) => String(review._id ?? review.id ?? '')),
  )
  const merged = [...existing]
  incoming.forEach((review) => {
    const id = String(review._id ?? review.id ?? '')
    if (!id || seen.has(id)) return
    seen.add(id)
    merged.push(review)
  })
  return merged
}

/** Display name from API (fake user or real user). */
function formatReviewerName(review) {
  const raw =
    review?.reviewerName ??
    review?.name ??
    review?.user?.name ??
    ''
  const trimmed = String(raw).trim()
  if (!trimmed) return 'Customer'
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const DISPLAY_IMAGES_PER_REVIEW = 3

function buildReviewMediaList(review) {
  if (Array.isArray(review.images) && review.images.length > 0) {
    return review.images
      .map((img) => {
        const raw = typeof img === 'string' ? { url: img } : img
        const url = getUrlFromMediaEntry(raw)
        if (!url) return null
        return { url, isVideo: isVideoMediaEntry(raw) }
      })
      .filter(Boolean)
  }
  if (review.imageUrl) {
    const url = review.imageUrl
    return [{ url, isVideo: isVideoUrlString(url) }]
  }
  return []
}

/**
 * Lightbox: full-screen overlay; images or videos with controls.
 */
function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const items = useMemo(() => {
    if (!Array.isArray(images)) return []
    return images
      .map((entry) => {
        if (typeof entry === 'string') {
          const url = entry
          return { url, isVideo: isVideoUrlString(url) }
        }
        const url = getUrlFromMediaEntry(entry)
        if (!url) return null
        return { url, isVideo: isVideoMediaEntry(entry) }
      })
      .filter(Boolean)
  }, [images])

  const [index, setIndex] = useState(initialIndex)
  const total = items.length

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? total - 1 : i - 1))
  }, [total])
  const goNext = useCallback(() => {
    setIndex((i) => (i >= total - 1 ? 0 : i + 1))
  }, [total])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  if (total === 0) return null
  const safeIndex = Math.min(Math.max(0, index), total - 1)
  const current = items[safeIndex]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-4 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Review media gallery"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 cursor-pointer"
        aria-label="Close"
      >
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:left-4 cursor-pointer"
        aria-label="Previous"
      >
        <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        className="relative max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[90vw] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {current?.isVideo ? (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            className="max-h-[80vh] sm:max-h-[85vh] max-w-full bg-black object-contain"
          />
        ) : (
          <img
            src={current?.url}
            alt=""
            className="max-h-[80vh] sm:max-h-[85vh] max-w-full object-contain"
          />
        )}
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-white/90">
          {safeIndex + 1} / {total}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:right-4 cursor-pointer"
        aria-label="Next"
      >
        <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Single review card: reviewer name only, rating badge, images, review text.
 */
function ReviewCard({ review, onOpenLightbox }) {
  const name = formatReviewerName(review)
  const rating = review.rating != null ? Number(review.rating).toFixed(1) : '—'
  const mediaList = useMemo(
    () => buildReviewMediaList(review),
    [review.images, review.imageUrl],
  )
  const description = review.description ?? ''
  const displayMedia = mediaList.slice(0, DISPLAY_IMAGES_PER_REVIEW)

  const openLightboxAt = (index) => {
    if (mediaList.length > 0 && onOpenLightbox) onOpenLightbox(mediaList, index)
  }

  return (
    <article className="border-b border-gray-200 py-4 sm:py-6 first:pt-0 last:border-b-0 font-inter">
      <div className="relative flex flex-wrap items-start justify-between gap-1 sm:gap-2">
        <p className="text-xs sm:text-sm font-medium text-gray-700 pr-14 sm:pr-20 min-w-0 break-words">
          {name}
        </p>
        <span className="absolute top-0 right-0 inline-flex items-center gap-0.5 rounded-md bg-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium text-white shrink-0">
          ★{rating}
        </span>
      </div>
      {displayMedia.length > 0 && (
        <div className="mt-2 sm:mt-3 flex gap-1.5 sm:gap-2 flex-wrap">
          {displayMedia.map((item, idx) => (
            <button
              key={`${item.url}-${idx}`}
              type="button"
              onClick={() => openLightboxAt(idx)}
              className="h-16 w-16 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer sm:h-20 sm:w-20"
              aria-label={item.isVideo ? `View video ${idx + 1}` : `View image ${idx + 1}`}
            >
              {item.isVideo ? (
                <span className="relative block h-full w-full bg-black">
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain object-center pointer-events-none"
                    aria-hidden
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full bg-black/60 px-2 py-1 text-sm text-white">▶</span>
                  </span>
                </span>
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 break-words">
        {description || 'No review text.'}
      </p>
    </article>
  )
}

/**
 * Reviews section: title "REVIEWS" + list of reviews from API (by itemId).
 * Matches layout: bold uppercase title; each review with name, rating badge, image, text.
 */

/** Format count with commas e.g. 2256896 → "2,256,896" */
function formatCount(n) {
  const num = Number(n)
  if (num == null || Number.isNaN(num)) return '0'
  return num.toLocaleString()
}

/** Render 5 stars for average rating (e.g. 4.5 = 4 full + 1 half) */
function StarDisplay({ avg }) {
  const value = Number(avg)
  if (Number.isNaN(value) || value < 0) return null
  const full = Math.floor(value)
  const hasHalf = value % 1 >= 0.25 && value % 1 < 0.75
  return (
    <div className="flex items-center gap-0.5 text-amber-500" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        i <= full
          ? <RiStarFill key={i} className="h-5 w-5 sm:h-6 sm:w-6" />
          : i === full + 1 && hasHalf
            ? <RiStarHalfFill key={i} className="h-5 w-5 sm:h-6 sm:w-6" />
            : <RiStarLine key={i} className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
      ))}
    </div>
  )
}

function buildRatingsSummary(summary, fallbackAvg = null) {
  const counts = {
    5: Number(summary?.distribution?.[5]) || 0,
    4: Number(summary?.distribution?.[4]) || 0,
    3: Number(summary?.distribution?.[3]) || 0,
    2: Number(summary?.distribution?.[2]) || 0,
    1: Number(summary?.distribution?.[1]) || 0,
  }
  const fromApi = Number(summary?.averageRating)
  if (Number.isFinite(fromApi) && fromApi > 0) {
    return { avg: fromApi, counts }
  }
  const fallback = Number(fallbackAvg)
  return {
    avg: Number.isFinite(fallback) && fallback > 0 ? fallback : 0,
    counts,
  }
}

export default function ReviewRating({
  itemId,
  refreshKey = 0,
  avgRating = null,
  onSummaryChange,
}) {
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState(null)
  const [ratingSummary, setRatingSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null) // { images: [], currentIndex: 0 } or null
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(false)

  useEffect(() => {
    setExpanded(false)
    setPage(1)
    setRatingSummary(null)
  }, [itemId, refreshKey])

  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      setReviews([])
      setPagination(null)
      setRatingSummary(null)
      return
    }
    let cancelled = false
    const isPreview = !expanded
    const fetchPage = isPreview ? 1 : page
    const limit = isPreview ? PREVIEW_REVIEWS_LIMIT : LOAD_MORE_BATCH_SIZE
    const isReplace = isPreview || page === 1

    if (isPreview) {
      setLoading(true)
    } else {
      setPageLoading(true)
    }
    setError(null)
    reviewsService
      .getByItem(itemId, { page: fetchPage, limit })
      .then((res) => {
        if (cancelled) return
        const payload = res?.data?.data ?? res?.data ?? {}
        const list = Array.isArray(payload.reviews) ? payload.reviews : []
        setReviews((prev) => (isReplace ? list : mergeReviewLists(prev, list)))
        setPagination(payload.pagination ?? null)
        if (payload.summary) {
          setRatingSummary(payload.summary)
          if (typeof onSummaryChange === 'function') {
            onSummaryChange(payload.summary)
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || err?.message || 'Failed to load reviews')
        if (isReplace) {
          setReviews([])
          setPagination(null)
        }
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setPageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, refreshKey, expanded, page, onSummaryChange])

  const totalReviews =
    ratingSummary?.totalReviews ??
    pagination?.totalItems ??
    reviews.length ??
    0
  const showViewAllLink = !expanded && totalReviews > PREVIEW_REVIEWS_LIMIT
  const hasMoreReviews = expanded && reviews.length < totalReviews
  const remainingReviews = Math.max(0, totalReviews - reviews.length)

  const ratingsSummary = useMemo(
    () => buildRatingsSummary(ratingSummary, avgRating),
    [ratingSummary, avgRating],
  )

  if (!itemId) return null

  const maxBarCount = Math.max(1, ...Object.values(ratingsSummary.counts))

  return (
    <section className="mt-8 sm:mt-10 border-t border-gray-200 pt-6 pb-6 sm:pt-8 sm:pb-8 md:pt-10 md:pb-10 lg:mt-12 lg:pt-10" aria-label="Customer ratings and reviews">
      {loading && (
        <p className="py-6 sm:py-8 text-xs sm:text-sm text-gray-500">Loading reviews…</p>
      )}
      {error && (
        <p className="py-6 sm:py-8 text-xs sm:text-sm text-gray-600 break-words">{error}</p>
      )}

      {/* Two columns: Left = Customer Ratings & Reviews + photos; Right = REVIEWS list */}
      {!loading && !error && (
        <div className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:gap-12 lg:items-start">
          {/* LEFT COLUMN: Customer Ratings & Reviews + distribution + customer photos */}
          <div className="min-w-0 flex-1 lg:max-w-[420px]">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
              Customer Ratings &amp; Reviews
            </h2>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">
              Verified reviews from customers who bought this product.
            </p>

            {totalReviews > 0 ? (
              <>
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-start sm:gap-6 md:gap-8">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">{ratingsSummary.avg.toFixed(1)}</span>
                    <StarDisplay avg={ratingsSummary.avg} />
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">{formatCount(totalReviews)}</p>
                  </div>
                  <div className="mt-3 sm:mt-0 min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingsSummary.counts[star] ?? 0
                      const width = maxBarCount ? (count / maxBarCount) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2 sm:gap-3">
                          <span className="w-4 shrink-0 text-xs sm:text-sm font-medium text-gray-800">{star}</span>
                          <div className="h-1.5 sm:h-2 flex-1 min-w-0 overflow-hidden rounded bg-gray-200">
                            <div
                              className="h-full bg-black rounded transition-all"
                              style={{ width: `${width}%`, minWidth: count ? '2px' : 0 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6 sm:mt-8">
                  <ProductReviewImages itemId={itemId} compact layout="featured" />
                </div>
              </>
            ) : (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">No reviews yet.</p>
            )}
          </div>

          {/* RIGHT COLUMN: REVIEWS list */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900 sm:text-xl md:text-2xl">
              Reviews
            </h2>
            {reviews.length === 0 && !loading ? (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">No reviews yet.</p>
            ) : (
              <>
                <div
                  className={`mt-4 sm:mt-6 transition-opacity ${pageLoading ? 'opacity-50 pointer-events-none' : ''}`}
                  aria-busy={pageLoading}
                >
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review._id ?? review.id}
                      review={review}
                      onOpenLightbox={(images, initialIndex) => setLightbox({ images, currentIndex: initialIndex })}
                    />
                  ))}
                </div>
                {showViewAllLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(true)
                      setPage(1)
                    }}
                    className="mt-4 w-full border-t border-gray-200 pt-4 text-left text-sm font-bold transition hover:underline focus:outline-none focus-visible:ring-2 touch-manipulation"
                    style={{ color: REVIEW_ACCENT }}
                  >
                    View all {formatCount(totalReviews)} reviews
                  </button>
                )}
                {expanded && (
                  <div className="mt-4 border-t border-gray-200 pt-4 space-y-3">
                    {hasMoreReviews && (
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={pageLoading}
                        className="w-full border border-gray-300 bg-white py-2.5 text-sm font-semibold uppercase tracking-wide text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
                      >
                        {pageLoading
                          ? 'Loading more reviews…'
                          : `Load more reviews (${formatCount(remainingReviews)} left)`}
                      </button>
                    )}
                    {!hasMoreReviews && totalReviews > PREVIEW_REVIEWS_LIMIT && (
                      <p className="text-xs text-gray-500 sm:text-sm">
                        Showing all {formatCount(totalReviews)} reviews
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false)
                        setPage(1)
                      }}
                      className="text-left text-sm font-bold transition hover:underline focus:outline-none focus-visible:ring-2 touch-manipulation"
                      style={{ color: REVIEW_ACCENT }}
                    >
                      Show less
                    </button>
                  </div>
                )}
                {lightbox && (
                  <ImageLightbox
                    images={lightbox.images}
                    initialIndex={lightbox.currentIndex}
                    onClose={() => setLightbox(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
