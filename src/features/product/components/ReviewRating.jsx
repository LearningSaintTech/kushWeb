import { useState, useEffect, useCallback, useMemo } from 'react'
import { reviewsService } from '../../../services/reviews.service.js'
import { RiStarFill, RiStarHalfFill, RiStarLine } from 'react-icons/ri'
import ProductReviewImages from './ProductReviewImages'

/** Format date as MM/DD/YYYY */
function formatReviewDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()
  return `${month}/${day}/${year}`
}

const DISPLAY_IMAGES_PER_REVIEW = 3

/**
 * Lightbox: full-screen overlay, large image, prev/next, close. Navigate with arrows or click outside.
 */
function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const total = images.length

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
  const currentUrl = images[safeIndex]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-4 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Review image gallery"
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
        aria-label="Previous image"
      >
        <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        className="relative max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[90vw] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentUrl}
          alt=""
          className="max-h-[80vh] sm:max-h-[85vh] max-w-full object-contain"
        />
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-white/90">
          {safeIndex + 1} / {total}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:right-4 cursor-pointer"
        aria-label="Next image"
      >
        <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Single review card: name + date, rating badge (top-right), 3 images in a row, review text.
 */
function ReviewCard({ review, onOpenLightbox }) {
  const name = review.name ?? 'Customer'
  const date = formatReviewDate(review.createdAt)
  const rating = review.rating != null ? Number(review.rating).toFixed(1) : '—'
  const imageList = Array.isArray(review.images) && review.images.length > 0
    ? review.images.map((img) => img?.url ?? img).filter(Boolean)
    : (review.imageUrl ? [review.imageUrl] : [])
  const description = review.description ?? ''
  const displayImages = imageList.slice(0, DISPLAY_IMAGES_PER_REVIEW)

  const handleImageClick = (index) => {
    if (imageList.length > 0 && onOpenLightbox) onOpenLightbox(imageList, index)
  }

  return (
    <article className="border-b border-gray-200 py-4 sm:py-6 first:pt-0 last:border-b-0 font-inter">
      <div className="relative flex flex-wrap items-start justify-between gap-1 sm:gap-2">
        <p className="text-xs sm:text-sm font-medium text-black pr-14 sm:pr-20 min-w-0 break-words">
          {name}{date ? `, ${date}` : ''}
        </p>
        <span className="absolute top-0 right-0 inline-flex items-center gap-0.5 rounded-md bg-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium text-white shrink-0">
          ★{rating}
        </span>
      </div>
      {displayImages.length > 0 && (
        <div className="mt-2 sm:mt-3 flex gap-1.5 sm:gap-2 flex-wrap">
          {displayImages.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleImageClick(idx)}
              className="h-16 w-16 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer sm:h-20 sm:w-20"
              aria-label={`View image ${idx + 1}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" />
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
 * Matches layout: bold uppercase title; each review with name/date, rating badge, image, text.
 */
const INITIAL_VISIBLE = 3

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

export default function ReviewRating({ itemId }) {
  const [data, setData] = useState({ reviews: [], pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { images: [], currentIndex: 0 } or null

  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    reviewsService
      .getByItem(itemId, { page: 1, limit: 20 })
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? {}
        setData({
          reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
          pagination: payload.pagination ?? null,
        })
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load reviews')
        setData({ reviews: [], pagination: null })
      })
      .finally(() => setLoading(false))
  }, [itemId])

  const totalReviews = data.pagination?.totalItems ?? data.reviews?.length ?? 0
  const ratingsSummary = useMemo(() => {
    const reviews = data.reviews ?? []
    if (reviews.length === 0) return { avg: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
    let sum = 0
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating))
      if (star >= 1 && star <= 5) counts[star] += 1
      sum += Number(r.rating) || 0
    })
    const avg = sum / reviews.length
    return { avg, counts }
  }, [data.reviews])

  if (!itemId) return null

  const reviews = data.reviews
  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE)
  const hasMore = reviews.length > INITIAL_VISIBLE && !showAll
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

            {reviews.length > 0 ? (
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
            {reviews.length === 0 ? (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">No reviews yet.</p>
            ) : (
              <>
                <div className="mt-4 sm:mt-6">
                  {visibleReviews.map((review) => (
                    <ReviewCard
                      key={review._id ?? review.id}
                      review={review}
                      onOpenLightbox={(images, initialIndex) => setLightbox({ images, currentIndex: initialIndex })}
                    />
                  ))}
                </div>
                {lightbox && (
                  <ImageLightbox
                    images={lightbox.images}
                    initialIndex={lightbox.currentIndex}
                    onClose={() => setLightbox(null)}
                  />
                )}
                {hasMore && (
                  <div className="mt-6 sm:mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="font-inter rounded border-2 border-gray-300 bg-white px-5 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm font-medium uppercase tracking-wide text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer touch-manipulation"
                    >
                      See more reviews
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
