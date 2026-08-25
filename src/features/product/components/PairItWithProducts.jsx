import { useEffect, useRef, useState } from 'react'
import { itemsService } from '../../../services/items.service.js'
import ProductCard from '../../../shared/components/ProductCard'
import {
  itemLaunchCardProps,
  isHomeVisibleProduct,
} from '../../../utils/productLaunch.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'
import { trackEvent } from '../../../analytics'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import productImage from '../../../assets/temporary/productimage.png'

const PAIR_CARD_PROPS = {
  compactGrid: true,
  rounded: 'none',

  showAddButton: true,
  addButtonOnImage: true,

  hideDelivery: true,
  hideImageActions: true,
  revealActionsOnHover: false,
  showOnlyWishlistIconWhenIdle: true,

  stackRatingOnMobile: false,
  compactImageOverlaysOnMobile: true,

  // Wider card + larger image
  imageClassName: 'w-full h-[200px] object-cover object-top',
  infoClassName: 'px-2 pt-2 pb-2',
  titleClassName:
    '!text-[10px] !font-medium !tracking-[0.08em] !leading-[1.4] line-clamp-2 min-h-[10px] uppercase text-neutral-500',
  descriptionClassName: 'hidden',
  priceRowClassName: 'mt-1 px-0 text-[12px] font-medium text-black',
}

function formatInr(n) {
  return `₹${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}`
}

function mapCrossSellToCard(item) {
  const id = item._id ?? item.id

  const price =
    item.discountedPrice != null
      ? formatInr(item.discountedPrice)
      : formatInr(item.price ?? 0)

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
    rating: undefined,

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
 * PDP "Pair it with"
 * GET /items/cross-sell/:itemId
 */
export default function PairItWithProducts({
  itemId,
  limit = 8,
}) {
  const trackRef = useRef(null)

  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!itemId) {
      setProducts([])
      return undefined
    }

    let cancelled = false
    setProducts([])

    ;(async () => {
      try {
        const res = await itemsService.getCrossSell(itemId, {
          page: 1,
          limit,
        })

        if (cancelled) return

        const data = res?.data?.data ?? res?.data

        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : []

        const mapped = list
          .filter(
            (it) =>
              it &&
              String(it._id || it.id) !== String(itemId)
          )
          .filter((it) => isHomeVisibleProduct(it))
          .map(mapCrossSellToCard)

        setProducts(mapped)

        debugLog('[Product] pair it with', {
          itemId,
          count: mapped.length,
        })
      } catch (err) {
        if (cancelled) return

        debugError(
          '[Product] pair it with failed',
          err?.message
        )

        setProducts([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [itemId, limit])

  if (!itemId || products.length === 0) return null

  return (
    <section
      className="mt-6 w-full"
      aria-labelledby="pair-it-with-heading"
    >
      <div className="mb-4">
        <h2
          id="pair-it-with-heading"
          className="
            font-inter
            text-[18px]
            font-extrabold
            uppercase
            tracking-[0.12em]
            text-[#222]
          "
        >
          Pairs With
        </h2>
      </div>

      <div
        ref={trackRef}
        className="
          flex
          w-full
          gap-[16px]
          overflow-x-auto
          overflow-y-visible
          scrollbar-hide
          pb-4
        "
        aria-label="Pairs with products"
      >
        {products.slice(0, 5).map((product) => (
          <div
            key={product.id}
            data-pair-card
            className="
              w-[160px]
              min-w-[160px]
              max-w-[160px]
              shrink-0
            "
          >
            <ProductCard
              {...product}
              {...PAIR_CARD_PROPS}
              onProductNavigate={(id) => {
                trackEvent({
                  eventType: 'recommendation_click',
                  itemId: id,
                  meta: {
                    source: 'pdp_pair_it_with',
                    seedItemId: itemId,
                  },
                })
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}