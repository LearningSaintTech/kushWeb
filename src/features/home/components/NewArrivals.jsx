import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProductPath, ROUTES } from '../../../utils/constants'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronForward, IoStarSharp } from 'react-icons/io5'
import { LuClock4 } from 'react-icons/lu'

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

  const listFromSection = section?.products
    ?.filter((p) => p?.item)
    ?.map((p) => ({
      id: p.item._id,
      image: p.item.thumbnail || productImage,
      title: p.item.name || '',
      price: p.item.discountedPrice != null ? `₹${p.item.discountedPrice}` : '₹0',
      delivery: section.deliveryType ? `GET IN ${section.deliveryType}` : '',
      rating: p.item.avgRating ?? 0,
    })) || []

  const list = listFromSection.length > 0 ? listFromSection : NEW_ARRIVALS_DATA
  const sectionTitle = section?.title || 'NEW ARRIVALS'
  const exploreTo = section?._id ? `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${section._id}` : `${ROUTES.SEARCH}?itemsOnly=1`

  const [activeSlide, setActiveSlide] = useState(
    list.length ? Math.min(2, list.length - 1) : 0
  )

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const startX = useRef(0)
  const isDragging = useRef(false)
  const moved = useRef(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

    if (diff > 80 && activeSlide > 0) setActiveSlide((prev) => prev - 1)
    if (diff < -80 && activeSlide < list.length - 1) setActiveSlide((prev) => prev + 1)

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

    if (diff > 80 && activeSlide > 0) setActiveSlide((prev) => prev - 1)
    if (diff < -80 && activeSlide < list.length - 1) setActiveSlide((prev) => prev + 1)

    isDragging.current = false
  }

  const handleCardClick = (index) => {
    if (moved.current) return
    const item = list[index]
    const productId = item?.id

    if (productId != null) {
      navigate(getProductPath(String(productId)))
    } else if (index !== activeSlide) {
      setActiveSlide(index)
    }
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

  return (
    <section className="bg-white pt-10 md:pt-16 pb-6 md:pb-8 overflow-hidden">
      <div className="container mx-auto px-4">

        <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-10">
          {sectionTitle}
        </h2>

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
                className="absolute top-0 left-0 rounded-2xl overflow-hidden bg-gray-100 shadow-xl cursor-pointer"
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
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-2 md:mt-4">
          <Link
            to={exploreTo}
            className="inline-flex items-center gap-1 uppercase text-xs md:text-sm tracking-widest text-black border-b pb-1 hover:opacity-70 transition-opacity"
          >
            <span>Explore More</span>
            <IoChevronForward />
          </Link>
        </div>

      </div>
    </section>
  )
}

export default NewArrivals