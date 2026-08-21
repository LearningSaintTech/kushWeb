import { useCallback, useEffect, useRef, useState } from 'react'
import { itemsService } from '../../../services/items.service.js'
import ProductCard from '../../../shared/components/ProductCard'
import { itemLaunchCardProps, isHomeVisibleProduct } from '../../../utils/productLaunch.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'
import { trackEvent } from '../../../analytics'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import productImage from '../../../assets/temporary/productimage.png'

/** Pair-it-with cards — ~244×442 design size, image Add overlay, no delivery */
const PAIR_CARD_PROPS = {
  compactGrid: true,
  rounded: 'none',
  showAddButton: true,
  addButtonOnImage: true,
  hideDelivery: true,
  hideImageActions: true,
  revealActionsOnHover: false,
  showOnlyWishlistIconWhenIdle: false,
  stackRatingOnMobile: false,
  compactImageOverlaysOnMobile: true,
  // Image dominates; total card ≈ 244×442 with info strip below
  imageClassName: 'w-full aspect-[244/380] h-auto object-cover object-top',
  infoClassName: 'px-1 pt-2.5 pb-1.5',
  titleClassName:
    'text-[11px] tracking-[0.12em] sm:text-xs sm:tracking-[0.14em] leading-snug',
  descriptionClassName: 'hidden',
  priceRowClassName: 'mt-1.5 text-xs sm:text-[13px]',
}

function formatInr(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function mapCrossSellToCard(item) {
  const id = item._id ?? item.id
  const price =
    item.discountedPrice != null ? formatInr(item.discountedPrice) : formatInr(item.price ?? 0)
  const originalPrice =
    item.discountedPrice != null &&
    item.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? formatInr(item.price)
      : undefined

  return {
    id,
    image: item.thumbnail || productImage,
    hoverImage: item.thumbnail || productImage,
    title: item.name ?? '',
    shortDescription: '',
    price,
    originalPrice,
    delivery: undefined,
    rating: item.avgRating ?? 0,
    outOfStock:
      item.totalStock != null
        ? Number(item.totalStock) <= 0
        : item.inStock === false,
    sectionSale: item.sectionSale ?? null,
    ...itemLaunchCardProps(item),
    ...listingBindOfferProps(item, null),
  }
}

/**
 * PDP “Pair it with” — GET /items/cross-sell/:itemId
 */
export default function PairItWithProducts({ itemId, limit = 8 }) {
  const trackRef = useRef(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const syncArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) {
      setCanPrev(false)
      setCanNext(false)
      return
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    setCanPrev(el.scrollLeft > 2)
    setCanNext(maxScroll > 2 && el.scrollLeft < maxScroll - 2)

    const card = el.querySelector('[data-pair-card]')
    if (card) {
      const gap = 7
      const step = card.offsetWidth + gap
      const idx = step > 0 ? Math.round(el.scrollLeft / step) : 0
      setActiveIndex(Math.max(0, Math.min(products.length - 1, idx)))
    }
  }, [products.length])

  useEffect(() => {
    if (!itemId) {
      setProducts([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setActiveIndex(0)
    ;(async () => {
      try {
        const res = await itemsService.getCrossSell(itemId, { page: 1, limit })
        if (cancelled) return
        const data = res?.data?.data ?? res?.data
        const list = Array.isArray(data?.items) ? data.items : []
        const mapped = list
          .filter((it) => it && String(it._id || it.id) !== String(itemId))
          .filter((it) => isHomeVisibleProduct(it))
          .map(mapCrossSellToCard)
        setProducts(mapped)
        debugLog('[Product] pair it with', { itemId, count: mapped.length })
      } catch (err) {
        if (cancelled) return
        debugError('[Product] pair it with failed', err?.message)
        setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [itemId, limit])

  useEffect(() => {
    const el = trackRef.current
    if (!el || loading) return undefined

    const raf = requestAnimationFrame(() => syncArrows())
    el.addEventListener('scroll', syncArrows, { passive: true })
    el.addEventListener('scrollend', syncArrows)
    window.addEventListener('resize', syncArrows)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', syncArrows)
      el.removeEventListener('scrollend', syncArrows)
      window.removeEventListener('resize', syncArrows)
    }
  }, [products, loading, syncArrows])

  const scrollToIndex = (index) => {
    const el = trackRef.current
    if (!el) return
    const cards = el.querySelectorAll('[data-pair-card]')
    const target = cards[index]
    if (!target) return
    const left = target.offsetLeft - el.offsetLeft
    el.scrollTo({ left, behavior: 'smooth' })
    setActiveIndex(index)
    window.setTimeout(syncArrows, 320)
  }

  const scrollByCard = (dir) => {
    const next = Math.max(0, Math.min(products.length - 1, activeIndex + dir))
    if (next === activeIndex) {
      const el = trackRef.current
      const card = el?.querySelector('[data-pair-card]')
      const step = card ? card.getBoundingClientRect().width + 7 : 251
      el?.scrollBy({ left: dir * step, behavior: 'smooth' })
      window.setTimeout(syncArrows, 320)
      return
    }
    scrollToIndex(next)
  }

  if (!itemId) return null
  if (!loading && products.length === 0) return null

  return (
    <section
      className="mt-8 border-t border-gray-200 pt-6 sm:mt-10 sm:pt-8"
      aria-labelledby="pair-it-with-heading"
    >
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div>
          <h2
            id="pair-it-with-heading"
            className="font-inter text-base font-bold tracking-tight text-black sm:text-lg"
          >
            PAIR IT WITH
          </h2>
          <p className="mt-1 font-inter text-xs text-neutral-500 sm:text-sm">
            Complete the look — add these with your pick
          </p>
        </div>
        {products.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous pair-it-with products"
              disabled={!canPrev && activeIndex <= 0}
              onClick={() => scrollByCard(-1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next pair-it-with products"
              disabled={!canNext && activeIndex >= products.length - 1}
              onClick={() => scrollByCard(1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="py-6 text-center font-inter text-sm text-neutral-500">
          Loading pairings…
        </p>
      ) : (
        <>
          <div
            ref={trackRef}
            className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-[7px] overflow-x-auto scroll-smooth px-1 pb-2"
            aria-label="Pair it with products carousel"
          >
            {products.map((product) => (
              <div
                key={product.id}
                data-pair-card
                className="w-[min(68vw,244px)] max-w-[244px] shrink-0 snap-start"
              >
                <ProductCard
                  {...product}
                  {...PAIR_CARD_PROPS}
                  onProductNavigate={(id) => {
                    trackEvent({
                      eventType: 'recommendation_click',
                      itemId: id,
                      meta: { source: 'pdp_pair_it_with', seedItemId: itemId },
                    })
                  }}
                />
              </div>
            ))}
          </div>

          {products.length > 1 ? (
            <div
              className="mt-3 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label="Pair it with pages"
            >
              {products.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Go to product ${index + 1}`}
                  onClick={() => scrollToIndex(index)}
                  className={`h-1.5 cursor-pointer rounded-full transition-all ${
                    index === activeIndex
                      ? 'w-4 bg-black'
                      : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
