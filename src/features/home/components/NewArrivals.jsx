import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getProductPath, ROUTES } from '../../../utils/constants'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronForward, IoChevronBack, IoStarSharp } from 'react-icons/io5'
import { LuClock4 } from 'react-icons/lu'
import { itemsService } from '../../../services/items.service.js'

const SECTION_PAGE_SIZE = 10

/** Map search API item to carousel card shape */
function mapItemToCard(item, deliveryTypeFallback) {
  const id = item._id ?? item.id
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = item.thumbnail ?? sorted[0]?.url ?? ''
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min delivery'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day delivery'
      : item.deliveryType
        ? String(item.deliveryType)
        : deliveryTypeFallback
          ? `GET IN ${deliveryTypeFallback}`
          : '—'
  return {
    id,
    image: imageUrl || productImage,
    title: item.name ?? '',
    price: item.discountedPrice != null ? `₹${item.discountedPrice}` : '₹0',
    delivery,
    rating: item.avgRating ?? 0,
    outOfStock: item.inStock === false,
  }
}

const NEW_ARRIVALS_DATA = [
  { id: 1, image: productImage, title: 'DENIM JACKET', price: '₹1500.00', delivery: 'GET IN 6-7 days', rating: 4.5 },
  { id: 2, image: hoverProductImage, title: 'OVERSIZED SHIRT', price: '₹1299.00', delivery: 'GET IN 4-6 days', rating: 4.2 },
  { id: 3, image: productImage, title: 'CARGO TROUSERS', price: '₹1899.00', delivery: 'GET IN 5-7 days', rating: 4.6 },
  { id: 4, image: hoverProductImage, title: 'GRAPHIC TEE', price: '₹899.00', delivery: 'GET IN 3-5 days', rating: 4.3 },
  { id: 5, image: productImage, title: 'BLAZER COAT', price: '₹2499.00', delivery: 'GET IN 6-8 days', rating: 4.7 },
  { id: 6, image: hoverProductImage, title: 'SLIM FIT JEANS', price: '₹1599.00', delivery: 'GET IN 4-6 days', rating: 4.4 },
  { id: 7, image: productImage, title: 'COTTON HOODIE', price: '₹1399.00', delivery: 'GET IN 5-7 days', rating: 4.5 },
  { id: 8, image: hoverProductImage, title: 'PRINTED TOP', price: '₹999.00', delivery: 'GET IN 3-5 days', rating: 4.1 },
  { id: 9, image: productImage, title: 'FORMAL SHIRT', price: '₹1199.00', delivery: 'GET IN 4-6 days', rating: 4.6 },
  { id: 10, image: hoverProductImage, title: 'WINTER JACKET', price: '₹2799.00', delivery: 'GET IN 6-8 days', rating: 4.8 },
]

function NewArrivals({ section }) {
  const navigate = useNavigate()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null

  const listFromSection = section?.products
    ?.filter((p) => p?.item)
    ?.map((p) => ({
      id: p.item._id,
      image: p.item.thumbnail || productImage,
      title: p.item.name || '',
      price: p.item.discountedPrice != null ? `₹${p.item.discountedPrice}` : '₹0',
      delivery: section.deliveryType ? `GET IN ${section.deliveryType}` : '',
      rating: p.item.avgRating ?? 0,
      outOfStock: p.inStock === false,
    })) || []

  const [sectionList, setSectionList] = useState([])
  const [sectionPage, setSectionPage] = useState(1)
  const [sectionHasMore, setSectionHasMore] = useState(false)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [sectionLoadingMore, setSectionLoadingMore] = useState(false)

  const list = section?._id
    ? (sectionList.length > 0 ? sectionList : listFromSection)
    : (listFromSection.length > 0 ? listFromSection : NEW_ARRIVALS_DATA)
  const sectionTitle = section?.title || 'NEW ARRIVALS'
  const exploreTo = section?._id ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}` : `${ROUTES.SEARCH}?itemsOnly=1`

  const [activeSlide, setActiveSlide] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const startX = useRef(0)
  const isDragging = useRef(false)
  const moved = useRef(false)

  const fetchSectionPage = useCallback(async (page) => {
    if (!section?._id) return
    const isFirst = page === 1
    if (isFirst) setSectionLoading(true)
    else setSectionLoadingMore(true)
    try {
      const params = { sectionId: section._id, page, limit: SECTION_PAGE_SIZE }
      if (pincode) params.pinCode = String(pincode)
      const res = await itemsService.search(params)
      const data = res?.data?.data ?? res?.data
      const items = data?.items ?? []
      const pag = data?.pagination ?? {}
      const mapped = items.map((it) => mapItemToCard(it, section.deliveryType))
      setSectionList((prev) => (page === 1 ? mapped : [...prev, ...mapped]))
      setSectionPage(page)
      const totalPages = Math.max(1, pag.totalPages ?? 1)
      setSectionHasMore(page < totalPages)
    } catch {
      setSectionHasMore(false)
    } finally {
      setSectionLoading(false)
      setSectionLoadingMore(false)
    }
  }, [section?._id, section?.deliveryType, pincode])

  useEffect(() => {
    if (section?._id) {
      setSectionList([])
      setSectionPage(1)
      fetchSectionPage(1)
    } else {
      setSectionList([])
      setSectionHasMore(false)
    }
  }, [section?._id, pincode, fetchSectionPage])

  const loadMore = () => {
    if (!sectionHasMore || sectionLoadingMore) return
    fetchSectionPage(sectionPage + 1)
  }

  // Prefetch next 10 when user is on 8th card (3 from end) so next batch is ready before they hit the end
  const prefetchThreshold = 3
  useEffect(() => {
    if (!section?._id || !sectionHasMore || sectionLoadingMore) return
    if (list.length > 0 && activeSlide >= list.length - prefetchThreshold) {
      loadMore()
    }
  }, [section?._id, sectionHasMore, sectionLoadingMore, list.length, activeSlide])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (list.length > 0 && activeSlide >= list.length) {
      setActiveSlide(list.length - 1)
    }
  }, [list.length, activeSlide])

  const CARD_WIDTH = isMobile ? 260 : 320
  const CARD_HEIGHT = isMobile ? 380 : 500
  const STEP_X = isMobile ? 140 : 160   // ↓ Reduced horizontal spacing
  const STEP_Z = -200
  const ROTATE_Y = isMobile ? 15 : 22

  const handleMouseDown = (e) => {
    isDragging.current = true
    moved.current = false
    startX.current = e.clientX
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    if (Math.abs(e.clientX - startX.current) > 5) {
      moved.current = true
    }
  }

  const handleMouseUp = (e) => {
    if (!isDragging.current) return
    const diff = e.clientX - startX.current
    const n = list.length
    if (n === 0) { isDragging.current = false; return }
    if (diff > 80) setActiveSlide((prev) => (prev - 1 + n) % n)
    if (diff < -80) setActiveSlide((prev) => (prev + 1) % n)
    isDragging.current = false
  }

  const handleTouchStart = (e) => {
    isDragging.current = true
    moved.current = false
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    if (!isDragging.current) return
    if (Math.abs(e.touches[0].clientX - startX.current) > 5) {
      moved.current = true
    }
  }

  const handleTouchEnd = (e) => {
    if (!isDragging.current) return
    const endX = e.changedTouches[0].clientX
    const diff = endX - startX.current
    const n = list.length
    if (n === 0) { isDragging.current = false; return }
    if (diff > 80) setActiveSlide((prev) => (prev - 1 + n) % n)
    if (diff < -80) setActiveSlide((prev) => (prev + 1) % n)
    isDragging.current = false
  }

  const n = list.length
  const goPrev = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (n === 0) return
    setActiveSlide((prev) => (prev - 1 + n) % n)
  }

  const goNext = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (n === 0) return
    setActiveSlide((prev) => (prev + 1) % n)
  }

  const handleCardClick = (index) => {
    if (moved.current) return
    const item = list[index]
    if (item?.outOfStock) return
    if (index !== activeSlide) {
      setActiveSlide(index)
      return
    }
    const productId = item?.id
    if (productId != null) navigate(getProductPath(String(productId)))
  }

  const getStyles = (index) => {
    if (isMobile) {
      if (activeSlide === index)
        return { opacity: 1, transform: 'translateX(0) scale(1)', zIndex: 10 }

      if (activeSlide - 1 === index)
        return { opacity: 0.6, transform: `translateX(-${STEP_X}px) scale(0.9)`, zIndex: 8 }

      if (activeSlide + 1 === index)
        return { opacity: 0.6, transform: `translateX(${STEP_X}px) scale(0.9)`, zIndex: 8 }

      return { opacity: 0 }
    }

    if (activeSlide === index)
      return { opacity: 1, transform: 'translateX(0) translateZ(0) rotateY(0deg)', zIndex: 10 }

    if (activeSlide - 1 === index)
      return { opacity: 1, transform: `translateX(-${STEP_X}px) translateZ(${STEP_Z}px) rotateY(${ROTATE_Y}deg)`, zIndex: 9 }

    if (activeSlide + 1 === index)
      return { opacity: 1, transform: `translateX(${STEP_X}px) translateZ(${STEP_Z}px) rotateY(-${ROTATE_Y}deg)`, zIndex: 9 }

    if (activeSlide - 2 === index)
      return { opacity: 0.9, transform: `translateX(-${STEP_X * 2}px) translateZ(${STEP_Z * 1.4}px) rotateY(${ROTATE_Y * 1.5}deg)`, zIndex: 8 }

    if (activeSlide + 2 === index)
      return { opacity: 0.9, transform: `translateX(${STEP_X * 2}px) translateZ(${STEP_Z * 1.4}px) rotateY(-${ROTATE_Y * 1.5}deg)`, zIndex: 8 }

    return { opacity: 0 }
  }

  const showPaginatedLoading = section?._id && sectionLoading && sectionList.length === 0

  return (
    <section className="bg-white pt-10 md:pt-16 pb-6 md:pb-8 overflow-hidden">
      <div className="container mx-auto px-4">

        <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-10">
          {sectionTitle}
        </h2>

        {showPaginatedLoading ? (
          <div className="flex justify-center items-center py-16 text-gray-500">
            Loading…
          </div>
        ) : (
        <>
        <div
          className="relative mx-auto cursor-grab active:cursor-grabbing select-none touch-pan-y"
          style={{
            width: '100%',
            maxWidth: isMobile ? '320px' : '1100px',
            height: CARD_HEIGHT + 60, // ↓ Reduced height to remove extra gap
            perspective: '1200px'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => (isDragging.current = false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous card"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center hover:scale-105 transition-all"
              >
                <IoChevronBack className="w-5 h-5 md:w-6 md:h-6 text-black" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next card"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center hover:scale-105 transition-all"
              >
                <IoChevronForward className="w-5 h-5 md:w-6 md:h-6 text-black" />
              </button>
            </>
          )}
          <div
            className="relative mx-auto"
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              transformStyle: 'preserve-3d'
            }}
          >
            {list.map((item, i) => (
              <div
                key={item.id ?? i}
                onClick={() => handleCardClick(i)}
                className={`absolute top-0 left-0 rounded-2xl overflow-hidden bg-gray-100 shadow-xl cursor-pointer ${item.outOfStock ? 'pointer-events-none' : ''}`}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  transition: 'transform 500ms cubic-bezier(0.34, 1.2, 0.64, 1), opacity 500ms ease',
                  ...getStyles(i)
                }}
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />

                <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

                <div className="absolute bottom-0 left-0 right-0 px-5 py-4 text-white flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="uppercase tracking-widest text-sm md:text-base font-medium">
                      {item.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs md:text-sm">
                      <IoStarSharp className="h-3.5 w-3.5 text-white" />
                      {item.rating}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 text-xs md:text-sm">
                    <span className="font-medium">{item.price}</span>
                    <span className="flex items-center gap-1 font-medium">
                      <LuClock4 className="h-3.5 w-3.5 text-white" />
                      {item.delivery}
                    </span>
                  </div>
                </div>
                {item.outOfStock && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" aria-hidden>
                    <span className="rounded-md bg-black/80 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white">
                      Out of stock
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-2 md:mt-4 flex flex-col items-center gap-2">
          <span className="text-xs text-gray-400" aria-live="polite">
            Cards: {list.length} {sectionLoadingMore ? '(loading more…)' : ''}
          </span>
          <Link
            to={exploreTo}
            className="inline-flex items-center gap-1 uppercase text-xs md:text-sm tracking-widest text-black border-b pb-1 hover:opacity-70 transition-opacity"
          >
            <span>Explore More</span>
            <IoChevronForward />
          </Link>
        </div>
        </>
        )}

      </div>
    </section>
  )
}

export default NewArrivals