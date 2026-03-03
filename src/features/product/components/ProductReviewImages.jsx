import { useState, useEffect, useCallback } from 'react'
import { reviewsService } from '../../../services/reviews.service.js'

/**
 * Lightbox for image gallery: large image, prev/next, close.
 */
function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const total = images.length

  const goPrev = useCallback(() => setIndex((i) => (i <= 0 ? total - 1 : i - 1)), [total])
  const goNext = useCallback(() => setIndex((i) => (i >= total - 1 ? 0 : i + 1)), [total])

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
  const currentUrl = typeof images[safeIndex] === 'string' ? images[safeIndex] : images[safeIndex]?.url

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-4 cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 cursor-pointer"
        aria-label="Close"
      >
        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goPrev() }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10 sm:left-4 cursor-pointer"
        aria-label="Previous"
      >
        <svg className="h-10 w-10 sm:h-12 sm:w-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="relative max-h-[80vh] sm:max-h-[85vh] max-w-[95vw] sm:max-w-[90vw] shrink-0" onClick={(e) => e.stopPropagation()}>
        <img src={currentUrl} alt="" className="max-h-[80vh] sm:max-h-[85vh] max-w-full object-contain" />
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm text-white/90">{safeIndex + 1} / {total}</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goNext() }}
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

const FEATURED_VISIBLE_COUNT = 3

/**
 * Fetches all review images for a product and shows them in a grid below reviews.
 * Click opens lightbox with prev/next.
 * @param {Object} props
 * @param {string} props.itemId - Product/item ID
 * @param {boolean} [props.compact] - When true, no top margin (for side-by-side layout)
 * @param {'default'|'featured'} [props.layout] - 'featured' = 3 image cards + "+N" for the rest
 */
export default function ProductReviewImages({ itemId, compact = false, layout = 'default' }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      return
    }
    setLoading(true)
    reviewsService
      .getImagesByItem(itemId)
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? {}
        const list = Array.isArray(payload.images) ? payload.images : []
        setImages(list.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean))
      })
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [itemId])

  if (!itemId) return null

  const urlList = images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)

  const openLightbox = (index) => {
    if (urlList.length) setLightbox({ images: urlList, currentIndex: index })
  }

  if (layout === 'featured') {
    const visibleUrls = urlList.slice(0, FEATURED_VISIBLE_COUNT)
    const restCount = Math.max(0, urlList.length - FEATURED_VISIBLE_COUNT)

    return (
      <>
        {loading && <p className="text-sm text-gray-500">Loading photos…</p>}
        {!loading && urlList.length === 0 && (
          <p className="text-sm text-gray-500">No customer photos yet.</p>
        )}
        {!loading && urlList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {visibleUrls.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openLightbox(idx)}
                className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20 sm:h-20 sm:w-20 md:h-24 md:w-24 cursor-pointer"
                aria-label={`View photo ${idx + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform" />
              </button>
            ))}
            {restCount > 0 && (
              <button
                type="button"
                onClick={() => openLightbox(FEATURED_VISIBLE_COUNT)}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-black/80 text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/20 hover:bg-black/90 sm:h-20 sm:w-20 md:h-24 md:w-24 cursor-pointer"
                aria-label={`View ${restCount} more photos`}
              >
                +{restCount}
              </button>
            )}
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
    )
  }

  return (
    <section className={compact ? 'pb-4 sm:pb-6' : 'mt-8 sm:mt-10 pb-6'} aria-label="Customer photos">
      <h2 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
        Customer Photos ({urlList.length})
      </h2>
      {loading && <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">Loading photos…</p>}
      {!loading && urlList.length === 0 && (
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">No customer photos yet.</p>
      )}
      {!loading && urlList.length > 0 && (
        <>
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-4">
            {urlList.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openLightbox(idx)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 sm:h-24 sm:w-24 md:h-28 md:w-28 cursor-pointer"
              >
                <img src={url} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </button>
            ))}
          </div>
          {lightbox && (
            <ImageLightbox
              images={lightbox.images}
              initialIndex={lightbox.currentIndex}
              onClose={() => setLightbox(null)}
            />
          )}
        </>
      )}
    </section>
  )
}
