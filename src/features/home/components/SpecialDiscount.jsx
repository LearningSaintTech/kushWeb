import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { IoChevronForward } from 'react-icons/io5'
import { debugLog, debugError } from '../../../utils/debugLog.js'
import { ROUTES, getSectionExplorePath } from '../../../utils/constants'
import { getPublicImageUrl } from '../../../services/config.js'
import { itemsService } from '../../../services/items.service.js'
import ProductCard, {
  PRODUCT_CARD_COMPACT_GRID_PROPS,
} from '../../../shared/components/ProductCard'
import { getItemStockTotal } from '../../../utils/productStock.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'
import { itemLaunchCardProps, isHomeVisibleProduct, filterHomeVisibleProducts } from '../../../utils/productLaunch.js'
import bgHero from '../../../assets/images/special-discount/Salesoffer.png'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'

const PRODUCT_CARD_LIMIT = 8

function resolveBannerSrc(section) {
  const desktopRaw = section?.desktopBanner?.[0]?.imageUrl
  return desktopRaw ? getPublicImageUrl(desktopRaw) : bgHero
}

function itemToCardProps(item, index, section = null) {
  const id = item._id ?? item.id ?? index
  const variants = item.variants ?? []
  const images = variants[0]?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = sorted[0]?.url ?? item.thumbnail ?? productImage
  const hoverUrl = sorted[1]?.url ?? imageUrl ?? hoverProductImage
  const price =
    item.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '₹0.00'
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
          : section?.deliveryType
            ? `GET IN ${section.deliveryType}`
            : '—'

  return {
    id,
    image: imageUrl,
    hoverImage: hoverUrl,
    title: item.name ?? 'Product',
    shortDescription: item.shortDescription ?? '',
    stock: getItemStockTotal(item),
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 4.5,
    outOfStock: item.inStock === false,
    ...itemLaunchCardProps(item),
    ...listingBindOfferProps(item, section),
  }
}

function resolveEmbeddedProducts(section) {
  return (
    section?.products
      ?.filter((p) => p?.item && isHomeVisibleProduct(p.item))
      ?.map((p, i) => {
        const item = {
          ...p.item,
          bindOffer: p.item.bindOffer ?? p.bindOffer ?? null,
        }
        return itemToCardProps(item, i, section)
      })
      ?.filter((p) => p.id) ?? []
  )
}

function buildSectionSearchParams(section, pincode) {
  if (!section?._id) return null
  const params = { limit: PRODUCT_CARD_LIMIT, page: 1 }
  if (pincode) params.pinCode = String(pincode)

  const subId = section.subcategoryId?.[0]
  const catId = section.categoryId?.[0]
  if (subId) {
    params.subcategoryId = subId
    if (catId) params.categoryId = catId
  } else if (catId) {
    params.categoryId = catId
  } else {
    params.sectionId = section._id
  }
  return params
}

function SpecialDiscount({ section }) {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const bannerSrc = resolveBannerSrc(section)
  const exploreTo = section?._id ? getSectionExplorePath(section._id) : ROUTES.SEARCH
  const embeddedProducts = resolveEmbeddedProducts(section)
  const [fetchedProducts, setFetchedProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const products =
    embeddedProducts.length > 0 ? embeddedProducts : fetchedProducts

  useEffect(() => {
    if (!section?._id || embeddedProducts.length > 0) {
      setFetchedProducts([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const params = buildSectionSearchParams(section, pincode)
    if (!params) return undefined

    setLoading(true)
    debugLog('[SpecialDiscount] fetch products', params)
    itemsService
      .search(params)
      .then((res) => {
        if (cancelled) return
        const items = res?.data?.data?.items ?? res?.data?.items ?? []
        const mapped = filterHomeVisibleProducts(
          items.map((item, i) => itemToCardProps(item, i, section)),
        ).slice(0, PRODUCT_CARD_LIMIT)
        setFetchedProducts(mapped)
        debugLog('[SpecialDiscount] products loaded', { count: mapped.length })
      })
      .catch((err) => {
        if (cancelled) return
        debugError('[SpecialDiscount] products failed', err)
        setFetchedProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    section?._id,
    section?.categoryId,
    section?.subcategoryId,
    pincode,
    embeddedProducts.length,
  ])

  return (
    <section className="w-full overflow-x-hidden bg-white">
      {/* Full-bleed square banner — no rounded corners; click → section explore */}
      <Link
        to={exploreTo}
        className="relative block w-full overflow-hidden bg-neutral-100 transition-opacity hover:opacity-95"
        aria-label={`Open ${section?.title || 'special offer'}`}
      >
        <img
          src={bannerSrc}
          alt={section?.title || 'Special offer'}
          className="block h-auto w-full max-w-full"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </Link>

      {/* Full product cards below banner */}
      <div className="mx-auto w-full max-w-[1920px] px-3 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
        {loading && products.length === 0 ? (
          <div className="py-10 text-center font-inter text-sm text-neutral-500">
            Loading…
          </div>
        ) : null}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 items-stretch gap-x-1.5 gap-y-2.5 sm:gap-x-3 sm:gap-y-4 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {products.map((product, idx) => (
              <div key={product.id ?? idx} className="flex h-full min-w-0 flex-col">
                <ProductCard {...product} {...PRODUCT_CARD_COMPACT_GRID_PROPS} />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && products.length === 0 ? (
          <p className="py-8 text-center font-inter text-sm text-neutral-500">
            No products in this sale yet.
          </p>
        ) : null}

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            to={exploreTo}
            className="inline-flex items-center gap-1 border-b border-black pb-1 font-inter text-xs uppercase tracking-widest text-black transition-opacity hover:opacity-70 sm:text-sm"
          >
            <span>Explore More</span>
            <IoChevronForward className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default SpecialDiscount
