import { useState, useEffect, useRef } from 'react'
import bannerImage from '../../assets/temporary/banners.png'
import mobileBannerImage from '../../assets/temporary/mobileBanner.png'

const Banner = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const intervalRef = useRef(null)

  // Create 10 slides with different images for mobile and desktop
  const slides = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    image: bannerImage,
    mobileImage: mobileBannerImage,
  }))

  // Auto-play functionality
  useEffect(() => {
    if (slides.length <= 1) return

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [slides.length])

  const goToSlide = (index) => {
    setCurrentSlide(index)
    // Reset auto-play timer when manually navigating
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
  }

  const goToPrevious = () => {
    const newIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1
    goToSlide(newIndex)
  }

  const goToNext = () => {
    const newIndex = (currentSlide + 1) % slides.length
    goToSlide(newIndex)
  }

  if (slides.length === 0) return null

  const currentSlideData = slides[currentSlide]

  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-screen overflow-hidden mt-16 sm:mt-20 md:mt-24 lg:mt-28">
      {/* Full Screen Banner Image */}
      <div className="absolute inset-0 w-full h-full">
        {/* Mobile Banner - shown on screens smaller than md (768px) */}
        <img
          src={currentSlideData.mobileImage}
          alt="Banner"
          className="w-full h-full object-cover object-center md:hidden"
        />
        {/* Desktop Banner - shown on md screens and larger */}
        <img
          src={currentSlideData.image}
          alt="Banner"
          className="hidden md:block w-full h-full object-cover object-center"
        />
      </div>

      {/* Navigation Arrows (only show if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full transition-colors"
            aria-label="Next slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Diamond Shape Navigation Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2 flex-wrap justify-center max-w-full px-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                currentSlide === index
                  ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rotate-45'
                  : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white/50 rotate-45 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Banner
