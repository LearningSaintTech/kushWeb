import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getProductPath, ROUTES } from '../../../utils/constants'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronForward } from 'react-icons/io5'
import { itemsService } from '../../../services/items.service.js'
import { listingBindOfferProps } from '../../../utils/bindOffer.js'

const SECTION_PAGE_SIZE = 10
const DISPLAY_COUNT = 5

/** Map search API item to card shape */
function mapItemToCard(item, deliveryTypeFallback, section = null) {
  const id = item._id ?? item.id
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = item.thumbnail ?? sorted[0]?.url ?? ''
  const hoverUrl = sorted[1]?.url ?? sorted[0]?.url ?? imageUrl
  const delivery =
    item.deliveryType === '90_MIN'
      ? '90 min'
      : item.deliveryType === 'ONE_DAY'
        ? '1 day'
        : item.deliveryType
          ? String(item.deliveryType)
          : deliveryTypeFallback
            ? `GET IN ${deliveryTypeFallback}`
            : '—'
  const price =
    item.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '₹0'
  const originalPrice =
    item.discountedPrice != null &&
    item.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : undefined
  return {
    id,
    image: imageUrl || productImage,
    hoverImage: hoverUrl || hoverProductImage,
    title: item.name ?? '',
    shortDescription: item.shortDescription ?? '',
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 0,
    outOfStock: item.inStock === false,
    ...listingBindOfferProps(item, section),
  }
}

const NEW_ARRIVALS_DATA = [
  { id: 1, image: productImage, hoverImage: hoverProductImage, title: 'Casual Dress', price: '₹75.00' },
  { id: 2, image: hoverProductImage, hoverImage: productImage, title: 'Mens Oversized Pants', price: '₹75.00' },
  { id: 3, image: productImage, hoverImage: hoverProductImage, title: 'Mens Oversized Tshirt', price: '₹75.00' },
  { id: 4, image: hoverProductImage, hoverImage: productImage, title: 'Mens Oversized Shirt', price: '₹75.00' },
  { id: 5, image: productImage, hoverImage: hoverProductImage, title: 'Mens Oversized Tshirt', price: '₹75.00' },
]

function NewArrivals({ section }) {
  const navigate = useNavigate()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null

  const listFromSection =
    section?.products
      ?.filter((p) => p?.item)
      ?.map((p) => {
        const item = p.item
        const variants = item.variants ?? []
        const firstVariant = variants[0]
        const images = firstVariant?.images ?? []
        const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const imageUrl = item.thumbnail || sorted[0]?.url || productImage
        const hoverUrl = sorted[1]?.url || sorted[0]?.url || imageUrl
        const price =
          item.discountedPrice != null
            ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            : '₹0'
        const originalPrice =
          item.discountedPrice != null &&
          item.price != null &&
          Number(item.price) > Number(item.discountedPrice)
            ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            : undefined
        return {
          id: item._id,
          image: imageUrl,
          hoverImage: hoverUrl || hoverProductImage,
          title: item.name || '',
          shortDescription: item.shortDescription || '',
          price,
          originalPrice,
          delivery:
            section.deliveryType === '90_MIN'
              ? '90 min'
              : section.deliveryType === 'ONE_DAY'
                ? '1 day'
                : section.deliveryType
                  ? `GET IN ${section.deliveryType}`
                  : '',
          rating: item.avgRating ?? 0,
          outOfStock: p.inStock === false,
          ...listingBindOfferProps(item, section),
        }
      }) || []

  const [sectionList, setSectionList] = useState([])
  const [sectionLoading, setSectionLoading] = useState(false)

  const list = section?._id
    ? sectionList.length > 0
      ? sectionList
      : listFromSection
    : listFromSection.length > 0
      ? listFromSection
      : NEW_ARRIVALS_DATA

  const displayList = list.slice(0, DISPLAY_COUNT)
  const sectionTitle = section?.title || 'NEW ARRIVAL'
  const exploreTo = section?._id
    ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}`
    : `${ROUTES.SEARCH}?itemsOnly=1`

  const fetchSectionPage = useCallback(
    async (page) => {
      if (!section?._id) return
      if (page === 1) setSectionLoading(true)
      try {
        const params = { sectionId: section._id, page, limit: SECTION_PAGE_SIZE }
        if (pincode) params.pinCode = String(pincode)
        const res = await itemsService.search(params)
        const data = res?.data?.data ?? res?.data
        const items = data?.items ?? []
        const mapped = items.map((it) => mapItemToCard(it, section.deliveryType, section))
        setSectionList(mapped)
      } catch {
        /* keep fallback */
      } finally {
        setSectionLoading(false)
      }
    },
    [section?._id, section?.deliveryType, pincode],
  )

  useEffect(() => {
    if (section?._id) {
      setSectionList([])
      fetchSectionPage(1)
    } else {
      setSectionList([])
    }
  }, [section?._id, pincode, fetchSectionPage])

  const openProduct = (item) => {
    if (!item || item.outOfStock) return
    if (item.id == null) return
    navigate(getProductPath(String(item.id), item.title, item.shortDescription))
  }

  const showLoading = section?._id && sectionLoading && sectionList.length === 0

  return (
    <section className="bg-white pt-6 md:pt-8 pb-8 md:pb-12">
      <h2 className="mb-5 px-4 text-center font-Raleway text-2xl font-extrabold tracking-tight text-black md:mb-8 md:text-4xl">
        {sectionTitle}
      </h2>

      {showLoading ? (
        <div className="flex items-center justify-center py-16 font-inter text-sm text-neutral-500">
          Loading…
        </div>
      ) : (
        <>
          {/* Full-bleed flush row — zero gap between images */}
          <div className="scrollbar-hide flex w-full overflow-x-auto md:overflow-visible">
            <div className="flex w-full min-w-0 md:grid md:grid-cols-5 gap-0.25">
              {displayList.map((item, i) => (
                <button
                  key={item.id ?? i}
                  type="button"
                  onClick={() => openProduct(item)}
                  disabled={item.outOfStock}
                  className={`group relative flex w-[72vw] shrink-0 flex-col text-left sm:w-[48vw] md:w-auto md:min-w-0 ${
                    item.outOfStock ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                        item.hoverImage && item.hoverImage !== item.image
                          ? 'opacity-100 group-hover:opacity-0'
                          : 'opacity-100'
                      }`}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    {item.hoverImage && item.hoverImage !== item.image ? (
                      <img
                        src={item.hoverImage}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    {item.outOfStock ? (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                        aria-hidden
                      >
                        <span className="rounded-md bg-black/80 px-3 py-1.5 font-inter text-xs font-semibold uppercase tracking-wider text-white">
                          Out of stock
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-baseline justify-between gap-2 bg-white px-2.5 py-2.5 sm:px-3 sm:py-3">
                    <p className="min-w-0 truncate font-inter text-[11px] font-medium leading-tight text-neutral-800 sm:text-xs">
                      {item.title}
                    </p>
                    <p className="shrink-0 font-inter text-[11px] font-medium leading-tight text-neutral-800 sm:text-xs">
                      {item.price}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-center md:mt-8">
            <Link
              to={exploreTo}
              className="inline-flex items-center gap-1 border-b border-black pb-1 font-inter text-xs uppercase tracking-widest text-black transition-opacity hover:opacity-70 md:text-sm"
            >
              <span>Explore More</span>
              <IoChevronForward />
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

export default NewArrivals
