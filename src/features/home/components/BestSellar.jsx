import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ProductCard from '../../../shared/components/ProductCard'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { itemsService } from '../../../services/items.service.js'

const GAP = 24
const SECTION_PAGE_SIZE = 10

const BEST_SELLER_PRODUCTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  image: productImage,
  hoverImage: hoverProductImage,
  title: 'DENIM JACKET',
  price: '₹1500.00',
  delivery: 'GET IN 6-7 days',
  rating: 4.5,
}))

function mapItemToCard(item, deliveryTypeFallback) {
  const id = item._id ?? item.id
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = item.thumbnail ?? sorted[0]?.url ?? ''
  const hoverUrl = sorted[1]?.url ?? imageUrl
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day'
      : item.deliveryType
        ? String(item.deliveryType)
        : deliveryTypeFallback
          ? `GET IN ${deliveryTypeFallback}`
          : '—'
  const price = item.discountedPrice != null ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0'
  const originalPrice = item.discountedPrice != null && item.price != null && Number(item.price) > Number(item.discountedPrice)
    ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : undefined
  return {
    id,
    image: imageUrl || productImage,
    hoverImage: hoverUrl || hoverProductImage,
    title: item.name ?? '',
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 4.5,
    outOfStock: item.inStock === false,
  }
}

function BestSellar({ section }) {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null

  const listFromSection = section?.products
    ?.filter((p) => p?.item)
    ?.map((p, i) => {
      const item = p.item
      const price = item.discountedPrice != null ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0'
      const originalPrice = item.discountedPrice != null && item.price != null && Number(item.price) > Number(item.discountedPrice)
        ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : undefined
      return {
        id: item._id,
        image: item.thumbnail || productImage,
        hoverImage: item.thumbnail || hoverProductImage,
        title: item.name || '',
        price,
        originalPrice,
        delivery: section.deliveryType === '90_MIN' ? '90 min' : section.deliveryType === 'ONE_DAY' ? '1 day' : section.deliveryType ? `GET IN ${section.deliveryType}` : '',
        rating: item.avgRating ?? 4.5,
        outOfStock: p.inStock === false,
      }
    }) || []

  const [sectionList, setSectionList] = useState([])
  const [sectionPage, setSectionPage] = useState(1)
  const [sectionHasMore, setSectionHasMore] = useState(false)
  const [sectionLoading, setSectionLoading] = useState(false)
  const [sectionLoadingMore, setSectionLoadingMore] = useState(false)

  const products = section?._id
    ? (sectionList.length > 0 ? sectionList : listFromSection)
    : (listFromSection.length > 0 ? listFromSection : BEST_SELLER_PRODUCTS)

  const [slideIndex, setSlideIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startIndexRef = useRef(0)
  const mobileCardRef = useRef(null)
  const desktopCardRef = useRef(null)

  const n = products.length
  const maxIndex = Math.max(0, n - 1)

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
    if (n > 0 && slideIndex >= n - prefetchThreshold) {
      loadMore()
    }
  }, [section?._id, sectionHasMore, sectionLoadingMore, n, slideIndex])

  React.useEffect(() => {
    if (n > 0 && slideIndex >= n) setSlideIndex(n - 1)
  }, [n, slideIndex])

  const getStep = useCallback(() => {
    const ref =
      typeof window !== 'undefined' && window.innerWidth >= 1024
        ? desktopCardRef
        : mobileCardRef
    if (!ref.current) return 320 + GAP
    return ref.current.offsetWidth + GAP
  }, [])

  const goPrev = () => setSlideIndex((i) => (n === 0 ? 0 : (i - 1 + n) % n))
  const goNext = () => setSlideIndex((i) => (n === 0 ? 0 : (i + 1) % n))

  const getTranslateX = useCallback(() => {
    const step = getStep()
    const baseIndex = dragOffset !== 0 ? startIndexRef.current : slideIndex
    return baseIndex * step + dragOffset
  }, [slideIndex, dragOffset, getStep])

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      isDraggingRef.current = true
      startXRef.current = e.clientX
      startIndexRef.current = slideIndex
    },
    [slideIndex]
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return
      const delta = startXRef.current - e.clientX
      const step = getStep()
      const maxDrag = step * maxIndex
      setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, delta)))
    },
    [getStep, maxIndex]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const step = getStep()
    const rawIndex = Math.round(dragOffset / step) + startIndexRef.current
    const newIndex = n > 0 ? ((rawIndex % n) + n) % n : 0
    setSlideIndex(newIndex)
    setDragOffset(0)
  }, [dragOffset, getStep, n])

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) handleMouseUp()
  }, [handleMouseUp])

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <section className="mt-5">
      <div className="w-full">

        {/* ========================= */}
        {/* MOBILE / TABLET DESIGN (< lg) — same format */}
        {/* ========================= */}
        <div className="block md:hidden ">

          {/* 1. Top row: black strip and BEST — same height, vertically aligned */}
          <div className="flex flex-row items-stretch gap-2 sm:gap-3 w-full h-14 sm:h-16">
            <div className="bg-black flex items-center  w-70 sm:w-56 shrink-0">
              <p className="text-white text-[10px] pl-2 sm:text-xs tracking-widest uppercase">
                FIND WHAT MAKES YOU KHUSH
              </p>
            </div>
            <h2 className="flex items-center text-4xl sm:text-5xl font-impact leading-none text-black shrink-0">BEST</h2>
          </div>
          {/* 2. Second row: SELLER and black strip — same height, vertically aligned */}
          <div className="flex flex-row items-stretch pl-30 lg:pl-120 md:pl-100 xl:pl-150 2xl:pl-200 gap-2 sm:gap-3 w-full h-14 sm:h-16 mt-1">
            <h2 className="flex items-center text-4xl sm:text-5xl font-impact leading-none text-black shrink-0">SELLER</h2>
            <div className="bg-black flex-1 min-w-[60px]" />
          </div>

          {/* Slider */}
          <div className="mt-6">
            {section?._id && sectionLoading && sectionList.length === 0 ? (
              <div className="flex justify-center items-center py-12 text-gray-500 text-sm">Loading…</div>
            ) : (
            <div
              className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="flex gap-4"
                style={{
                  transform: `translateX(-${getTranslateX()}px)`,
                  width: 'max-content',
                  transition:
                    dragOffset === 0 ? 'transform 500ms ease-out' : 'none',
                }}
              >
                {products.map((product, idx) => (
                  <div
                    key={product.id ?? idx}
                    className="shrink-0 w-[280px]"
                    ref={idx === 0 ? mobileCardRef : undefined}
                  >
                    <ProductCard {...product} roundedTop="3xl" />
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Arrows + Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous"
                className="w-10 h-10 border border-black flex items-center justify-center hover:opacity-80 disabled:opacity-40 cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next"
                className="w-10 h-10 border border-black flex items-center justify-center hover:opacity-80 disabled:opacity-40 cursor-pointer"
              >
                ›
              </button>
            </div>
            {/* <span className="text-xs text-red-400 mt-2" aria-live="polite">
              Cards: {n} {sectionLoadingMore ? '(loading more…)' : ''}
            </span> */}
          </div>
        </div>

        {/* ========================= */}
        {/* DESKTOP DESIGN (≥ lg) */}
        {/* ========================= */}
        <div className="hidden md:block">

          {/* Your original header layout */}
          <div className="font-raleway">
            <div className="flex items-center mb-2">
              <div className="bg-black w-30 sm:w-10 md:w-100 lg:w-120 xl:w-220 2xl:w-270 h-10 sm:h-10 md:h-15 lg:h-15 xl:h-23 2xl:h-29 flex items-end justify-end px-2">
                <span className="text-white text-xs sm:text-base font-inter tracking-[0.18em] uppercase whitespace-nowrap">
                  FIND WHAT MAKES YOU KHUSH
                </span>
              </div>
              <h2
                className="leading-none uppercase text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem] xl:text-[7.5rem] 2xl:text-[9.26rem]"
                style={{
                  fontFamily: 'Impact',
                  fontWeight: '400',
                }}
              >
                BEST
              </h2>
            </div>

            <div className="flex  lg:pl-120 md:pl-100 xl:pl-150 2xl:pl-200 items-center">
              <h2
                className="leading-none uppercase text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem] xl:text-[7.5rem] 2xl:text-[9.26rem]"
                style={{
                  fontFamily: 'Impact',
                  fontWeight: '400',
                }}
              >
                SELLER
              </h2>
              <div className="bg-black w-30 sm:w-10 md:w-190 lg:w-200 xl:w-290 2xl:w-270 h-10 sm:h-10 md:h-15 lg:h-15 xl:h-23 2xl:h-29 flex items-end justify-end px-2" />
            </div>
          </div>

          {/* Desktop Slider */}
          <div className="flex items-center gap-6 w-full">
            <div className="flex-1 min-w-0 max-w-[65vw]">
              {section?._id && sectionLoading && sectionList.length === 0 ? (
                <div className="flex justify-center items-center py-12 text-gray-500 text-sm">Loading…</div>
              ) : (
              <div
                className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className="flex gap-6"
                  style={{
                    transform: `translateX(-${getTranslateX()}px)`,
                    width: 'max-content',
                    transition:
                      dragOffset === 0 ? 'transform 500ms ease-out' : 'none',
                  }}
                >
                  {products.map((product, idx) => (
                    <div
                      key={product.id ?? idx}
                      className="shrink-0 w-[280px] sm:w-[320px]"
                      ref={idx === 0 ? desktopCardRef : undefined}
                    >
                      <ProductCard {...product} roundedTop="3xl" />
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* Desktop Arrows + Pagination */}
            <div className="flex flex-col items-center gap-4 shrink-0 mt-24">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous"
                  className="w-12 h-12 border border-black flex items-center justify-center hover:opacity-80 disabled:opacity-40 cursor-pointer"
                >
                  <IoChevronBack />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next"
                  className="w-12 h-12 border border-black flex items-center justify-center hover:opacity-80 disabled:opacity-40 cursor-pointer"
                >
                  <IoChevronForward />
                </button>
              </div>
            </div>
            {/* <span className="text-xs text-red-400 mt-2" aria-live="polite">
              Cards: {n} {sectionLoadingMore ? '(loading more…)' : ''}
            </span> */}
          </div>
        </div>

      </div>
    </section>
  )
}

export default BestSellar
