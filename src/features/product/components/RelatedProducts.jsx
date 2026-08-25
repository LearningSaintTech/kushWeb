import { useCallback, useEffect, useRef, useState } from 'react'
import { itemsService } from '../../../services/items.service.js'
import ProductCard, {
  PRODUCT_CARD_COMPACT_GRID_PROPS,
} from '../../../shared/components/ProductCard'
import { itemLaunchCardProps } from '../../../utils/productLaunch.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'
import { trackEvent } from '../../../analytics'
import { useAuth } from '../../../app/context/AuthContext'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import productImage from '../../../assets/temporary/productimage.png'

function formatInr(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function extractItems(payload) {
  const raw = payload?.data ?? payload
  const nested = raw?.data ?? raw
  if (Array.isArray(nested?.items)) return nested.items
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(nested)) return nested
  if (Array.isArray(raw)) return raw
  return []
}

function mapSuggestionToCard(item) {
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
    shortDescription: item.shortDescription ?? '',
    price,
    originalPrice,
    delivery: '—',
    rating: item.avgRating ?? 0,
    outOfStock: item.totalStock != null ? Number(item.totalStock) <= 0 : false,
    sectionSale: item.sectionSale ?? null,
    ...itemLaunchCardProps(item),
    ...listingBindOfferProps(item, null),
  }
}

/**
 * Related products — API recommendation list in a horizontal carousel.
 * Backend requires auth for recommendation-suggestions; wait for authChecked,
 * then fall back to public subcategory search for guests.
 */
export default function RelatedProducts({
  itemId,
  subcategoryId = null,
  categoryId = null,
  limit = 10,
}) {
  const trackRef = useRef(null)
  const { token, authChecked } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(() => Boolean(itemId))
  const [activeIndex, setActiveIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  console.log('[RelatedProducts] render', {
    itemId,
    authChecked,
    hasToken: Boolean(token),
    loading,
    productsCount: products.length,
    willHide: !itemId || (!loading && products.length === 0),
  })

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

    const card = el.querySelector('[data-related-card]')
    if (card) {
      const gap = 16
      const step = card.offsetWidth + gap
      const idx = step > 0 ? Math.round(el.scrollLeft / step) : 0
      setActiveIndex(Math.max(0, Math.min(products.length - 1, idx)))
    }
  }, [products.length])

  useEffect(() => {
    console.log('[RelatedProducts] effect run', {
      itemId,
      limit,
      authChecked,
      hasToken: Boolean(token),
    })
    if (!itemId) {
      console.warn('[RelatedProducts] skipped — no itemId')
      setProducts([])
      setLoading(false)
      return undefined
    }
    if (!authChecked) {
      console.log('[RelatedProducts] waiting for authChecked…')
      setLoading(true)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setActiveIndex(0)

    const applyList = (list, source) => {
      const mapped = (Array.isArray(list) ? list : [])
        .filter((it) => it && String(it._id || it.id) !== String(itemId))
        .map(mapSuggestionToCard)
      console.log('[RelatedProducts] mapped', {
        source,
        rawCount: list?.length ?? 0,
        mappedCount: mapped.length,
        firstIds: mapped.slice(0, 5).map((p) => p.id),
      })
      setProducts(mapped)
      debugLog('[Product] related products', {
        itemId,
        source,
        count: mapped.length,
      })
      return mapped.length
    }

    const fetchViaSearchFallback = async () => {
      if (!subcategoryId && !categoryId) {
        console.warn('[RelatedProducts] no subcategory/category for guest fallback')
        return 0
      }
      console.log('[RelatedProducts] guest fallback → items/search', {
        subcategoryId,
        categoryId,
      })
      const res = await itemsService.search({
        ...(subcategoryId ? { subcategoryId } : { categoryId }),
        limit,
        page: 1,
      })
      if (cancelled) return 0
      return applyList(extractItems(res), 'search-fallback')
    }

    ;(async () => {
      try {
        // Backend requires Bearer — skip for guests and use public search instead
        if (!token) {
          console.warn(
            '[RelatedProducts] no auth token — using search fallback (recommendation-suggestions requires login)',
          )
          await fetchViaSearchFallback()
          return
        }

        console.log('[RelatedProducts] fetching recommendation-suggestions…', {
          itemIds: itemId,
          limit,
          hasToken: true,
        })
        const res = await itemsService.getRecommendationSuggestions({
          type: 'item',
          limit,
          itemIds: itemId,
        })
        if (cancelled) {
          console.warn('[RelatedProducts] response ignored — effect cancelled')
          return
        }
        const raw = res?.data
        if (raw && raw.success === false) {
          console.warn('[RelatedProducts] API success:false', {
            message: raw.message,
            raw,
          })
          await fetchViaSearchFallback()
          return
        }
        const list = extractItems(res)
        console.log('[RelatedProducts] API response', {
          status: res?.status,
          rawItemsLength: list.length,
          raw,
        })
        if (list.length === 0) {
          await fetchViaSearchFallback()
          return
        }
        applyList(list, 'recommendation-suggestions')
      } catch (err) {
        if (cancelled) {
          console.warn('[RelatedProducts] error ignored — effect cancelled')
          return
        }
        console.error('[RelatedProducts] fetch failed', {
          message: err?.message,
          status: err?.response?.status,
          responseData: err?.response?.data,
        })
        debugError('[Product] related products failed', err?.message)
        try {
          await fetchViaSearchFallback()
        } catch (fallbackErr) {
          console.error('[RelatedProducts] search fallback failed', {
            message: fallbackErr?.message,
            status: fallbackErr?.response?.status,
          })
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      console.log('[RelatedProducts] effect cleanup', { itemId })
      cancelled = true
    }
  }, [itemId, limit, authChecked, token, subcategoryId, categoryId])

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
    const cards = el.querySelectorAll('[data-related-card]')
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
      const card = el?.querySelector('[data-related-card]')
      const step = card ? card.getBoundingClientRect().width + 16 : 280
      el?.scrollBy({ left: dir * step, behavior: 'smooth' })
      window.setTimeout(syncArrows, 320)
      return
    }
    scrollToIndex(next)
  }

  if (!itemId) {
    console.warn('[RelatedProducts] return null — missing itemId')
    return null
  }
  if (!loading && products.length === 0) {
    console.warn('[RelatedProducts] return null — no products (hidden)', {
      itemId,
      authChecked,
      hasToken: Boolean(token),
    })
    return null
  }

  console.log('[RelatedProducts] showing section', {
    itemId,
    loading,
    productsCount: products.length,
  })

  return (
    <section
      className="mt-10 border-t border-gray-200 pt-8 sm:mt-12 sm:pt-10"
      aria-labelledby="related-products-heading"
    >
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2
            id="related-products-heading"
            className="font-inter text-base font-bold tracking-tight text-black sm:text-lg"
          >
            RELATED PRODUCTS
          </h2>
          <p className="mt-1 font-inter text-xs text-neutral-500 sm:text-sm">
            You may also like these picks
          </p>
        </div>
        {products.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous related products"
              disabled={!canPrev && activeIndex <= 0}
              onClick={() => scrollByCard(-1)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next related products"
              disabled={!canNext && activeIndex >= products.length - 1}
              onClick={() => scrollByCard(1)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="py-8 text-center font-inter text-sm text-neutral-500">
          Loading related products…
        </p>
      ) : (
        <>
          <div
            ref={trackRef}
            className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
            aria-label="Related products carousel"
          >
            {products.map((product) => (
              <div
                key={product.id}
                data-related-card
                className="w-[78%] max-w-[280px] shrink-0 snap-start sm:w-[46%] sm:max-w-none md:w-[31%] lg:w-[28%]"
              >
                <ProductCard
                  {...product}
                  {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                  onProductNavigate={(id) => {
                    trackEvent({
                      eventType: 'recommendation_click',
                      itemId: id,
                      meta: { source: 'pdp_related', seedItemId: itemId },
                    })
                  }}
                />
              </div>
            ))}
          </div>

          {products.length > 1 ? (
            <div
              className="mt-4 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label="Related products pages"
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
