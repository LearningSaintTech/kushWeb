import { useState, useEffect } from 'react'
import { reviewsService } from '../../../services/reviews.service.js'
import { RiStarFill } from 'react-icons/ri'

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

/**
 * Single review card: reviewer name + date on left, rating badge on right;
 * below: square image left, review text right.
 */
function ReviewCard({ review }) {
  const name = review.name ?? 'Customer'
  const date = formatReviewDate(review.createdAt)
  const rating = review.rating != null ? Number(review.rating).toFixed(1) : '—'
  const imageList = Array.isArray(review.images) && review.images.length > 0
    ? review.images.map((img) => img?.url ?? img).filter(Boolean)
    : (review.imageUrl ? [review.imageUrl] : [])
  const description = review.description ?? ''

  return (
    <article className="border-b border-gray-200 py-6 first:pt-4 last:border-b-0 font-inter">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-black sm:text-base">
          {name}{date ? `, ${date}` : ''}
        </p>
        <span className="inline-flex items-center gap-1 rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white sm:px-3 sm:py-1.5 sm:text-sm">
          <RiStarFill className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          {rating}
        </span>
      </div>
      <div className="mt-4 flex gap-4">
        {imageList.length > 0 && (
          <div className="flex shrink-0 gap-1.5 sm:gap-2">
            {imageList.map((url, idx) => (
              <div
                key={idx}
                className="h-20 w-20 overflow-hidden rounded bg-gray-100 sm:h-24 sm:w-24"
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <p className="min-w-0 flex-1 text-sm text-gray-600 sm:text-base">
          {description || 'No review text.'}
        </p>
      </div>
    </article>
  )
}

/**
 * Reviews section: title "REVIEWS" + list of reviews from API (by itemId).
 * Matches layout: bold uppercase title; each review with name/date, rating badge, image, text.
 */
const INITIAL_VISIBLE = 3

export default function ReviewRating({ itemId }) {
  const [data, setData] = useState({ reviews: [], pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAll, setShowAll] = useState(false)

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
        console.log('[ReviewRating] response', res)
        const payload = res?.data?.data ?? res?.data ?? {}
        console.log('[ReviewRating] parsed payload', payload)
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

  if (!itemId) return null

  const reviews = data.reviews
  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE)
  const hasMore = reviews.length > INITIAL_VISIBLE && !showAll

  return (
    <section className="mt-10 border-t border-gray-200 bg-gray-100 pt-8 pb-8 sm:mt-12 sm:pt-10 md:mt-14" aria-label="Reviews">
      <h2 className="text-xl font-bold uppercase tracking-wider text-black sm:text-2xl md:text-3xl">
        Reviews
      </h2>
      {loading && (
        <p className="py-8 text-sm text-gray-500">Loading reviews…</p>
      )}
      {error && (
        <p className="py-8 text-sm text-gray-600">{error}</p>
      )}
      {!loading && !error && reviews.length === 0 && (
        <p className="py-8 text-sm text-gray-500">No reviews yet.</p>
      )}
      {!loading && !error && reviews.length > 0 && (
        <>
          <div className="mt-6">
            {visibleReviews.map((review) => (
              <ReviewCard key={review._id ?? review.id} review={review} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="font-inter rounded-lg border-2 border-gray-300 bg-white px-8 py-3 text-sm font-medium uppercase tracking-wide text-gray-700 hover:bg-gray-50 transition-colors"
              >
                See more reviews
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
