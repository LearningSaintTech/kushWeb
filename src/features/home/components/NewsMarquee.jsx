import React, { useState, useEffect, useRef } from 'react'
import { newsService } from '../../../services/news.service.js'
import { getPublicImageUrl } from '../../../services/config.js'
import { debugLog, debugError } from '../../../utils/debugLog.js'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

/**
 * Editorial / Press fallback logos
 * Used when API returns no active press items or API is unavailable.
 */
const DEFAULT_PRESS_ITEMS = [
  {
    _id: 'press-vogue',
    name: 'Vogue India',
    fontStyle:
      'font-serif font-black tracking-widest text-lg sm:text-xl md:text-2xl',
    logoText: 'VOGUE',
    subText: 'INDIA',
    links: ['https://www.vogue.in'],
  },
  {
    _id: 'press-idiva',
    name: 'iDIVA',
    fontStyle:
      'font-sans font-black tracking-tight text-xl sm:text-2xl md:text-3xl italic',
    logoText: 'iDIVA',
    links: ['https://www.idiva.com'],
  },
  {
    _id: 'press-femina',
    name: 'FEMINA',
    fontStyle:
      'font-serif font-bold tracking-[0.22em] text-lg sm:text-xl md:text-2xl',
    logoText: 'FEMINA',
    links: ['https://www.femina.in'],
  },
  {
    _id: 'press-forbes',
    name: 'Forbes India',
    fontStyle:
      'font-serif font-black tracking-tight text-lg sm:text-xl md:text-2xl',
    logoText: 'Forbes',
    subText: 'INDIA',
    links: ['https://www.forbesindia.com'],
  },
  {
    _id: 'press-elle',
    name: 'ELLE',
    fontStyle:
      'font-serif font-light tracking-[0.35em] text-lg sm:text-xl md:text-2xl',
    logoText: 'E L L E',
    links: ['https://elle.in'],
  },
]

function NewsLogoItem({ item }) {
  const [imgError, setImgError] = useState(false)

  const rawLogo = item.logo || item.logoUrl || ''
  const logoSrc = rawLogo ? getPublicImageUrl(rawLogo) : ''

  const link =
    Array.isArray(item.links) && item.links.length > 0
      ? item.links[0]
      : typeof item.links === 'string'
        ? item.links
        : null

  const hasValidLink = Boolean(
    link &&
      typeof link === 'string' &&
      link.trim() &&
      !link.includes('undefined')
  )

  const content = (
    <div
      className="
        relative
        flex
        h-14
        sm:h-16
        md:h-20
        items-center
        justify-center
        px-6
        sm:px-10
        md:px-14
        select-none
      "
    >
      {/* Actual Logo */}
      {logoSrc && !imgError ? (
        <img
  src={logoSrc}
  alt={item.name || 'Press Logo'}
  loading="lazy"
  referrerPolicy="no-referrer"
  onError={() => setImgError(true)}
  className="
    h-10
    sm:h-12
    md:h-16
    lg:h-20
    w-auto
    max-w-[180px]
    sm:max-w-[220px]
    md:max-w-[280px]
    lg:max-w-[320px]
    object-contain
  "
/>
      ) : (
        /* Text fallback */
        <div className="flex flex-col items-center justify-center text-center text-[#171717]">
          <span
            className={
              item.fontStyle ||
              'font-serif text-base sm:text-lg md:text-xl font-bold tracking-wider text-black'
            }
          >
            {item.logoText || item.name}
          </span>

          {item.subText && (
            <span
              className="
                mt-0.5
                font-sans
                text-[8px]
                sm:text-[9px]
                font-bold
                tracking-[0.25em]
                text-[#737373]
                uppercase
              "
            >
              {item.subText}
            </span>
          )}
        </div>
      )}

      {/* Tooltip */}
      {item.name && (
        <span
          className="
            pointer-events-none
            absolute
            -bottom-2.5
            left-1/2
            -translate-x-1/2
            scale-0
            whitespace-nowrap
            rounded
            bg-black/90
            px-2
            py-0.5
            font-inter
            text-[10px]
            font-medium
            text-white
            opacity-0
            shadow-sm
            transition-all
            duration-200
            group-hover/item:scale-100
            group-hover/item:opacity-100
            z-20
          "
        >
          {item.name}
        </span>
      )}
    </div>
  )

  if (hasValidLink) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title={`Read about Khush on ${item.name || 'Press'}`}
        className="
          inline-flex
          shrink-0
          items-center
          justify-center
          cursor-pointer
          focus:outline-hidden
        "
      >
        {content}
      </a>
    )
  }

  return (
    <div className="inline-flex shrink-0 items-center justify-center">
      {content}
    </div>
  )
}

export default function NewsMarquee() {
  const [newsItems, setNewsItems] = useState([])
  const [loading, setLoading] = useState(true)

  const scrollContainerRef = useRef(null)
  const isManuallyScrollingRef = useRef(false)

  // ============================================================
  // GET ACTIVE PRESS / NEWS ITEMS
  // ============================================================

  useEffect(() => {
    let cancelled = false

    setLoading(true)

    newsService
      .getActive()
      .then((res) => {
        if (cancelled) return

        debugLog(
          '[NewsMarquee] active news response:',
          res?.data
        )

        const raw =
          res?.data?.data ??
          res?.data?.items ??
          res?.data ??
          []

        const activeList = Array.isArray(raw)
          ? raw.filter(
              (item) =>
                item &&
                item.isActive !== false
            )
          : []

        if (activeList.length > 0) {
          // Sort according to sortOrder
          const sorted = [...activeList].sort(
            (a, b) =>
              (a.sortOrder ?? 0) -
              (b.sortOrder ?? 0)
          )

          setNewsItems(sorted)
        } else {
          // Use fallback press logos
          setNewsItems(DEFAULT_PRESS_ITEMS)
        }
      })
      .catch((err) => {
        debugError(
          '[NewsMarquee] active news API error, using fallbacks:',
          err
        )

        if (!cancelled) {
          setNewsItems(DEFAULT_PRESS_ITEMS)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ============================================================
  // PREPARE MARQUEE ITEMS
  // ============================================================

  const displayItems =
    newsItems.length > 0
      ? newsItems
      : DEFAULT_PRESS_ITEMS

  /*
   * Make sure there are enough items
   * for a smooth infinite marquee.
   */
  const multiplier = Math.max(
    1,
    Math.ceil(
      8 / Math.max(1, displayItems.length)
    )
  )

  const repeatedItems = Array.from(
    { length: multiplier },
    () => displayItems
  ).flat()

  // ============================================================
  // MANUAL SCROLL
  // ============================================================

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return

    isManuallyScrollingRef.current = true

    const scrollAmount =
      direction === 'left'
        ? -280
        : 280

    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    })

    setTimeout(() => {
      isManuallyScrollingRef.current = false
    }, 400)
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <section
      aria-label="As Featured In Press"
      className="
        group/news-marquee
        relative
        w-full
        overflow-hidden
        
        bg-white
        py-6
        sm:py-8
        md:py-10
      "
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[1440px]
          items-center
          justify-between
          px-3
          sm:px-6
          md:px-8
        "
      >
        {/* =====================================================
            LEFT ARROW
        ===================================================== */}

        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Previous press logo"
          className="
            relative
            z-20
            hidden
            sm:flex
            h-9
            w-9
            md:h-10
            md:w-10
            shrink-0
            cursor-pointer
            items-center
            justify-center
            rounded-full
            border
            border-[#D4D4D4]
            bg-white
            text-[#737373]
            shadow-xs
            transition-all
            duration-200
            hover:border-black
            hover:text-black
            hover:scale-105
            active:scale-95
            focus:outline-hidden
          "
        >
          <IoChevronBack className="h-4 w-4 md:h-4.5 md:w-4.5" />
        </button>

        {/* =====================================================
            MARQUEE VIEWPORT
        ===================================================== */}

        <div className="relative flex-1 overflow-hidden">
          {/* Left Fade */}

          <div
            className="
              pointer-events-none
              absolute
              inset-y-0
              left-0
              z-10
              w-10
              sm:w-16
              md:w-24
              bg-gradient-to-r
              from-white
              via-white/80
              to-transparent
            "
            aria-hidden="true"
          />

          {/* Right Fade */}

          <div
            className="
              pointer-events-none
              absolute
              inset-y-0
              right-0
              z-10
              w-10
              sm:w-16
              md:w-24
              bg-gradient-to-l
              from-white
              via-white/80
              to-transparent
            "
            aria-hidden="true"
          />

          {/* ===================================================
              SCROLL CONTAINER
          =================================================== */}

          <div
            ref={scrollContainerRef}
            className="
              scrollbar-hide
              flex
              w-full
              overflow-x-auto
              select-none
            "
          >
            <div className="news-press-marquee-track flex items-center">
              {/* =================================================
                  PRIMARY TRACK
              ================================================= */}

              <div className="flex shrink-0 items-center">
                {repeatedItems.map((item, idx) => (
                  <NewsLogoItem
                    key={`press-item-${item._id || idx}-${idx}`}
                    item={item}
                  />
                ))}
              </div>

              {/* =================================================
                  DUPLICATE TRACK
              ================================================= */}

              <div
                className="flex shrink-0 items-center"
                aria-hidden="true"
              >
                {repeatedItems.map((item, idx) => (
                  <NewsLogoItem
                    key={`press-item-dup-${item._id || idx}-${idx}`}
                    item={item}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT ARROW
        ===================================================== */}

        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Next press logo"
          className="
            relative
            z-20
            hidden
            sm:flex
            h-9
            w-9
            md:h-10
            md:w-10
            shrink-0
            cursor-pointer
            items-center
            justify-center
            rounded-full
            border
            border-[#D4D4D4]
            bg-white
            text-[#737373]
            shadow-xs
            transition-all
            duration-200
            hover:border-black
            hover:text-black
            hover:scale-105
            active:scale-95
            focus:outline-hidden
          "
        >
          <IoChevronForward className="h-4 w-4 md:h-4.5 md:w-4.5" />
        </button>
      </div>
    </section>
  )
}