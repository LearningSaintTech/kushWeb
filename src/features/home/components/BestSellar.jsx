import React, { useState, useRef, useCallback } from 'react'
import ProductCard from '../../../shared/components/ProductCard'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

const GAP = 24

const BEST_SELLER_PRODUCTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  image: productImage,
  hoverImage: hoverProductImage,
  title: 'DENIM JACKET',
  price: '₹1500.00',
  delivery: 'GET IN 6-7 days',
  rating: 4.5,
}))

function BestSellar({ section }) {
  const listFromSection = section?.products
    ?.filter((p) => p?.item)
    ?.map((p, i) => ({
      id: p.item._id,
      image: p.item.thumbnail || productImage,
      hoverImage: p.item.thumbnail || hoverProductImage,
      title: p.item.name || '',
      price: p.item.discountedPrice != null ? `₹${p.item.discountedPrice}` : '₹0',
      delivery: section.deliveryType ? `GET IN ${section.deliveryType}` : '',
      rating: p.item.avgRating ?? 4.5,
    })) || []
  const products = listFromSection.length > 0 ? listFromSection : BEST_SELLER_PRODUCTS

  const [slideIndex, setSlideIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startIndexRef = useRef(0)
  const mobileCardRef = useRef(null)
  const desktopCardRef = useRef(null)

  const maxIndex = Math.max(0, products.length - 1)

  const getStep = useCallback(() => {
    const ref =
      typeof window !== 'undefined' && window.innerWidth >= 1024
        ? desktopCardRef
        : mobileCardRef
    if (!ref.current) return 320 + GAP
    return ref.current.offsetWidth + GAP
  }, [])

  const goPrev = () => setSlideIndex((i) => Math.max(0, i - 1))
  const goNext = () => setSlideIndex((i) => Math.min(maxIndex, i + 1))

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
    const newIndex = Math.round(dragOffset / step) + startIndexRef.current
    setSlideIndex(Math.max(0, Math.min(maxIndex, newIndex)))
    setDragOffset(0)
  }, [dragOffset, getStep, maxIndex])

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
          </div>

          {/* Arrows */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={goPrev}
              disabled={slideIndex === 0}
              className="w-10 h-10 border border-black flex items-center justify-center disabled:opacity-40"
            >
              ‹
            </button>
            <button
              onClick={goNext}
              disabled={slideIndex >= maxIndex}
              className="w-10 h-10 border border-black flex items-center justify-center disabled:opacity-40"
            >
              ›
            </button>
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
            </div>

            {/* Desktop Arrows */}
            <div className="flex gap-4 shrink-0 mt-24">
              <button
                onClick={goPrev}
                disabled={slideIndex === 0}
                className="w-12 h-12 border border-black flex items-center justify-center disabled:opacity-40"
              >
                <IoChevronBack />
              </button>
              <button
                onClick={goNext}
                disabled={slideIndex >= maxIndex}
                className="w-12 h-12 border border-black flex items-center justify-center disabled:opacity-40"
              >
                <IoChevronForward />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default BestSellar
