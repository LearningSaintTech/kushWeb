import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { sectionsService } from '../../../services/content.service.js'
import ProductCard, {
  PRODUCT_CARD_COMPACT_GRID_PROPS,
} from '../../../shared/components/ProductCard'
import { itemLaunchCardProps } from '../../../utils/productLaunch.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'
import { trackEvent } from '../../../analytics'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import productImage from '../../../assets/temporary/productimage.png'

const SECTION_TITLE = 'JUST FOR YOU'

function formatInr(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function mapSectionProduct(row, section) {
  const item = row?.item
  if (!item?._id && !item?.id) return null
  const id = item._id ?? item.id
  const price =
    item.discountedPrice != null ? formatInr(item.discountedPrice) : formatInr(item.price ?? 0)
  const originalPrice =
    item.discountedPrice != null &&
    item.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? formatInr(item.price)
      : undefined
  const delivery =
    row.deliveryType === '90_MIN'
      ? '90 min'
      : row.deliveryType === 'ONE_DAY'
        ? '1 day'
        : row.deliveryType
          ? String(row.deliveryType)
          : section?.deliveryType
            ? `GET IN ${section.deliveryType}`
            : '—'

  return {
    id,
    image: item.thumbnail || productImage,
    hoverImage: item.thumbnail || productImage,
    title: item.name ?? '',
    shortDescription: item.shortDescription ?? '',
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 0,
    outOfStock: row.inStock === false,
    sectionSale: row.sectionSale ?? item.sectionSale ?? null,
    ...itemLaunchCardProps(item),
    ...listingBindOfferProps(item, section),
  }
}

/**
 * PDP “Just For You” — MANUAL section from /sections/get (title match).
 */
export default function JustForYouProducts() {
  const trackRef = useRef(null)
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [title, setTitle] = useState(SECTION_TITLE)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const syncArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) {
      setCanPrev(false)
      setCanNext(false)
      return
    }
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < maxScroll - 4)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params = { isWeb: true, limit: 50, productLimit: 20 }
        if (pincode) params.pinCode = String(pincode)
        const res = await sectionsService.getActive(params)
        if (cancelled) return
        const raw = res?.data?.data?.items ?? res?.data?.items ?? []
        let section = raw.find(
          (s) => String(s?.title || '').trim().toUpperCase() === SECTION_TITLE,
        )

        if (section?._id && (!section.products || section.products.length === 0)) {
          try {
            const oneRes = await sectionsService.getOne(section._id)
            const full = oneRes?.data?.data ?? oneRes?.data
            if (full?.products?.length) section = full
          } catch {
            /* keep list section */
          }
        }

        if (!section) {
          setProducts([])
          setTitle(SECTION_TITLE)
          debugLog('[Product] Just For You section not found')
          return
        }

        const mapped = (section.products || [])
          .map((row) => mapSectionProduct(row, section))
          .filter(Boolean)
        setTitle(section.title || SECTION_TITLE)
        setProducts(mapped)
        debugLog('[Product] Just For You', { id: section._id, count: mapped.length })
      } catch (err) {
        if (cancelled) return
        debugError('[Product] Just For You failed', err?.message)
        setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pincode])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    syncArrows()
    el.addEventListener('scroll', syncArrows, { passive: true })
    window.addEventListener('resize', syncArrows)
    return () => {
      el.removeEventListener('scroll', syncArrows)
      window.removeEventListener('resize', syncArrows)
    }
  }, [products, loading, syncArrows])

  const scrollByCard = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-just-for-you-card]')
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  if (!loading && products.length === 0) return null

  return (
    <section
      className="mt-10 border-t border-gray-200 pt-8 sm:mt-12 sm:pt-10"
      aria-labelledby="just-for-you-heading"
    >
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2
            id="just-for-you-heading"
            className="font-inter text-base font-bold tracking-tight text-black sm:text-lg"
          >
            {title}
          </h2>
          <p className="mt-1 font-inter text-xs text-neutral-500 sm:text-sm">
            Handpicked styles for you
          </p>
        </div>
        {products.length > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous Just For You products"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-black transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next Just For You products"
              disabled={!canNext}
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
        <p className="py-8 text-center font-inter text-sm text-neutral-500">Loading…</p>
      ) : (
        <div
          ref={trackRef}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-4"
          aria-label="Just For You products carousel"
        >
          {products.map((product) => (
            <div
              key={product.id}
              data-just-for-you-card
              className="w-[min(70%,16rem)] shrink-0 snap-start sm:w-[calc((100%-3rem)/2)] md:w-[calc((100%-4.5rem)/3)] lg:w-[calc((100%-4.5rem)/4)]"
            >
              <ProductCard
                {...product}
                {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                onProductNavigate={(id) => {
                  trackEvent({
                    eventType: 'recommendation_click',
                    itemId: id,
                    meta: { source: 'pdp_just_for_you' },
                  })
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
