import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Helmet } from 'react-helmet-async'
import ProductCard, {
  PRODUCT_CARD_COMPACT_GRID_PROPS,
} from '../../shared/components/ProductCard'
import { itemsService } from '../../services/items.service.js'
import { sectionsService } from '../../services/content.service.js'
import { getPublicImageUrl } from '../../services/config.js'
import { ROUTES } from '../../utils/constants'
import { getItemStockTotal } from '../../utils/productStock.js'
import { listingBindOfferProps } from '../../utils/bindOffer.js'
import { debugLog, debugError } from '../../utils/debugLog.js'
import { SHAKTIMAN_KEYWORDS } from '../../utils/shaktiman.js'
import { itemLaunchCardProps } from '../../utils/productLaunch.js'
import ShaktimaanFab from './components/ShaktimaanFab.jsx'
import ShaktimanPromoBanner from './components/ShaktimanPromoBanner.jsx'

const PAGE_LIMIT = 24
const SEARCH_KEYWORDS = SHAKTIMAN_KEYWORDS

function itemToCardProps(item, section = null) {
  const id = item._id ?? item.id
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = sorted[0]?.url ?? item.thumbnail ?? ''
  const hoverUrl = sorted[1]?.url ?? imageUrl
  const price =
    item.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : item.price != null
        ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '—'
  const originalPrice =
    item.discountedPrice != null &&
    item.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : undefined
  const delivery =
    item.deliveryType === '90_MIN'
      ? '90 min'
      : item.deliveryType === 'ONE_DAY'
        ? '1 day'
        : item.deliveryType
          ? String(item.deliveryType)
          : '—'
  const offerProps = listingBindOfferProps(item, section)
  const stockTotal = getItemStockTotal(item)
  const outOfStock =
    item.inStock === false ||
    (stockTotal != null && stockTotal <= 0)
  return {
    id,
    image: imageUrl
      ? getPublicImageUrl(imageUrl) || imageUrl
      : 'https://placehold.co/400x520?text=Product',
    hoverImage: hoverUrl ? getPublicImageUrl(hoverUrl) || hoverUrl : undefined,
    title: item.name ?? 'Product',
    shortDescription: item.shortDescription ?? '',
    stock: stockTotal,
    price,
    originalPrice,
    delivery,
    rating: 4,
    outOfStock,
    ...itemLaunchCardProps(item),
    ...offerProps,
  }
}

function sectionProductsToCards(section) {
  const rows = Array.isArray(section?.products) ? section.products : []
  return rows
    .map((row) => row?.item)
    .filter(Boolean)
    .map((item) => itemToCardProps(item, section))
}

function isShaktimanSection(section) {
  const title = String(section?.title || section?.name || '').toLowerCase()
  const slug = String(section?.slug || '').toLowerCase()
  return (
    title.includes('shaktiman') ||
    title.includes('shakti') ||
    slug.includes('shaktiman') ||
    slug.includes('shakti')
  )
}

/**
 * Shaktiman collection landing — same banner as home, products below.
 */
export default function ShaktimanCollectionPage() {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [sectionMeta, setSectionMeta] = useState(null)

  const loadProducts = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true)
      setError(null)
      try {
        // 1) Prefer a CMS section titled Shaktiman (if configured)
        if (pageNum === 1 && !append) {
          try {
            const secRes = await sectionsService.getActive({
              isWeb: true,
              limit: 30,
              productLimit: 40,
              ...(pincode ? { pinCode: String(pincode) } : {}),
            })
            const items =
              secRes?.data?.data?.items ?? secRes?.data?.items ?? []
            const match = items.find(isShaktimanSection)
            if (match) {
              const cards = sectionProductsToCards(match)
              debugLog('[Shaktiman] matched CMS section', {
                id: match._id,
                title: match.title,
                products: cards.length,
              })
              if (cards.length) {
                setSectionMeta(match)
                setProducts(cards)
                setHasMore(false)
                setLoading(false)
                return
              }
            }
          } catch (secErr) {
            debugError('[Shaktiman] section lookup failed', secErr?.message)
          }
        }

        // 2) Keyword search fallback
        let found = []
        let pagination = null
        for (const keyword of SEARCH_KEYWORDS) {
          const params = {
            keyword,
            page: pageNum,
            limit: PAGE_LIMIT,
            ...(pincode ? { pinCode: String(pincode) } : {}),
          }
          debugLog('[Shaktiman] search', params)
          const res = await itemsService.search(params)
          const data = res?.data?.data ?? res?.data ?? {}
          const raw = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.results)
              ? data.results
              : []
          if (raw.length) {
            found = raw
            pagination = data?.pagination ?? null
            debugLog('[Shaktiman] search hit', { keyword, count: raw.length })
            break
          }
        }

        const cards = found.map((item) => itemToCardProps(item, sectionMeta))
        setProducts((prev) => (append ? [...prev, ...cards] : cards))
        const totalPages = pagination?.totalPages ?? pagination?.pages
        const current = pagination?.page ?? pageNum
        setHasMore(
          totalPages != null
            ? current < totalPages
            : cards.length >= PAGE_LIMIT,
        )
      } catch (err) {
        debugError('[Shaktiman] load products failed', err?.message)
        setError(err?.message ?? 'Failed to load products')
        if (!append) setProducts([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [pincode, sectionMeta],
  )

  useEffect(() => {
    setPage(1)
    loadProducts(1, false)
  }, [pincode]) // eslint-disable-line react-hooks/exhaustive-deps -- reload on pincode only

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadProducts(next, true)
  }

  return (
    <>
      <Helmet>
        <title>Shaktiman Limited Edition | Khush Pehno</title>
        <meta
          name="description"
          content="Unleash your inner hero with the official-inspired Shaktiman collection — hoodies, t-shirts, joggers and accessories."
        />
      </Helmet>

      <div className="min-h-screen bg-white pt-[6.5rem] md:pt-[4.25rem] lg:pt-[4.5rem]">
        <ShaktimaanFab variant="collection" />
        <section
          className="w-full overflow-x-hidden"
          aria-label="Shaktiman banner"
        >
          <div className="relative mx-auto w-full max-w-[1920px]">
            <ShaktimanPromoBanner loading="eager" />
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-10 lg:py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                Limited Edition
              </p>
              <h1 className="mt-1 font-inter text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Shaktimaan Collection
              </h1>
            </div>
            <Link
              to={ROUTES.HOME}
              className="font-inter text-sm font-medium text-neutral-500 transition hover:text-black"
            >
              ← Back to home
            </Link>
          </div>

          {loading && products.length === 0 ? (
            <p className="py-16 text-center font-inter text-sm text-neutral-500">
              Loading products…
            </p>
          ) : null}

          {error && products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-inter text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => loadProducts(1, false)}
                className="mt-4 cursor-pointer font-inter text-sm font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!loading && !error && products.length === 0 ? (
            <p className="py-16 text-center font-inter text-sm text-neutral-500">
              Products for this collection will appear here soon.
            </p>
          ) : null}

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-2.5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((item) => (
                <ProductCard
                  key={item.id}
                  {...item}
                  {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                />
              ))}
            </div>
          ) : null}

          {hasMore ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="cursor-pointer rounded-full bg-black px-6 py-3 font-inter text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
