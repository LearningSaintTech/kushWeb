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
      'font-serif font-black tracking-widest text-lg sm:text-xl md:text-2xl xl:text-3xl',
    logoText: 'VOGUE',
    subText: 'INDIA',
    links: ['https://www.vogue.in'],
  },
  {
    _id: 'press-idiva',
    name: 'iDIVA',
    fontStyle:
      'font-sans font-black tracking-tight text-xl sm:text-2xl md:text-3xl xl:text-4xl italic',
    logoText: 'iDIVA',
    links: ['https://www.idiva.com'],
  },
  {
    _id: 'press-femina',
    name: 'FEMINA',
    fontStyle:
      'font-serif font-bold tracking-[0.22em] text-lg sm:text-xl md:text-2xl xl:text-3xl',
    logoText: 'FEMINA',
    links: ['https://www.femina.in'],
  },
  {
    _id: 'press-forbes',
    name: 'Forbes India',
    fontStyle:
      'font-serif font-black tracking-tight text-lg sm:text-xl md:text-2xl xl:text-3xl',
    logoText: 'Forbes',
    subText: 'INDIA',
    links: ['https://www.forbesindia.com'],
  },
  {
    _id: 'press-elle',
    name: 'ELLE',
    fontStyle:
      'font-serif font-light tracking-[0.35em] text-lg sm:text-xl md:text-2xl xl:text-3xl',
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
      !link.includes('undefined'),
  )

  const content = (
    <div className="relative flex h-14 items-center justify-center px-5 select-none sm:h-16 sm:px-8 md:h-20 md:px-10 lg:h-24 lg:px-12 xl:h-28 xl:px-14 2xl:h-32 2xl:px-16">
      {logoSrc && !imgError ? (
        <img
          src={logoSrc}
          alt={item.name || 'Press Logo'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-10 w-auto max-w-[160px] object-contain sm:h-12 sm:max-w-[200px] md:h-16 md:max-w-[240px] lg:h-20 lg:max-w-[280px] xl:h-24 xl:max-w-[320px] 2xl:h-28 2xl:max-w-[360px]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-[#171717]">
          <span
            className={
              item.fontStyle ||
              'font-serif text-base font-bold tracking-wider text-black sm:text-lg md:text-xl xl:text-2xl'
            }
          >
            {item.logoText || item.name}
          </span>

          {item.subText ? (
            <span className="mt-0.5 font-sans text-[8px] font-bold uppercase tracking-[0.25em] text-[#737373] sm:text-[9px] xl:text-[11px]">
              {item.subText}
            </span>
          ) : null}
        </div>
      )}

      {/* {item.name ? (
        <span className="pointer-events-none absolute -bottom-2.5 left-1/2 z-20 -translate-x-1/2 scale-0 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 font-inter text-[10px] font-medium text-white opacity-0 shadow-sm transition-all duration-200 group-hover/item:scale-100 group-hover/item:opacity-100 xl:text-xs">
          {item.name}
        </span>
      ) : null} */}
    </div>
  )

  if (hasValidLink) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title={`Read about Khush on ${item.name || 'Press'}`}
        className="group/item inline-flex shrink-0 items-center justify-center focus:outline-hidden"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="group/item inline-flex shrink-0 items-center justify-center">
      {content}
    </div>
  )
}

export default function NewsMarquee() {
  const [newsItems, setNewsItems] = useState([])
  const [loading, setLoading] = useState(true)

  const scrollContainerRef = useRef(null)
  const isManuallyScrollingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    setLoading(true)

    newsService
      .getActive()
      .then((res) => {
        if (cancelled) return

        debugLog('[NewsMarquee] active news response:', res?.data)

        const raw = res?.data?.data ?? res?.data?.items ?? res?.data ?? []

        const activeList = Array.isArray(raw)
          ? raw.filter((item) => item && item.isActive !== false)
          : []

        if (activeList.length > 0) {
          const sorted = [...activeList].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          )
          setNewsItems(sorted)
        } else {
          setNewsItems(DEFAULT_PRESS_ITEMS)
        }
      })
      .catch((err) => {
        debugError('[NewsMarquee] active news API error, using fallbacks:', err)

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

  const displayItems = newsItems.length > 0 ? newsItems : DEFAULT_PRESS_ITEMS

  /*
   * Enough copies for a smooth infinite marquee on wide screens.
   */
  const multiplier = Math.max(2, Math.ceil(12 / Math.max(1, displayItems.length)))

  const repeatedItems = Array.from({ length: multiplier }, () => displayItems).flat()

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return

    isManuallyScrollingRef.current = true

    const width = scrollContainerRef.current.clientWidth || 320
    const scrollAmount = direction === 'left' ? -Math.max(280, width * 0.45) : Math.max(280, width * 0.45)

    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    })

    setTimeout(() => {
      isManuallyScrollingRef.current = false
    }, 400)
  }

  if (loading && newsItems.length === 0) {
    return (
      <section
        aria-label="As Featured In Press"
        className="w-full bg-white py-6 sm:py-8 md:py-10 lg:py-12 xl:py-14"
      >
        <div className="mx-auto h-14 w-full max-w-[1920px] animate-pulse rounded bg-neutral-100 sm:h-16 md:h-20 lg:h-24 xl:h-28" />
      </section>
    )
  }

  return (
    <section
      aria-label="As Featured In Press"
      className="group/news-marquee relative w-full overflow-hidden bg-white py-6 sm:py-8 md:py-10 lg:py-12 xl:py-14 2xl:py-16"
    >
      <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 md:px-8 lg:gap-4 lg:px-10 xl:px-12 2xl:px-16">
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Previous press logo"
          className="relative z-20 hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#737373] shadow-xs transition-all duration-200 hover:scale-105 hover:border-black hover:text-black focus:outline-hidden active:scale-95 sm:flex md:h-10 md:w-10 lg:h-11 lg:w-11 xl:h-12 xl:w-12"
        >
          <IoChevronBack className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white via-white/80 to-transparent sm:w-12 md:w-16 lg:w-20 xl:w-24"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white via-white/80 to-transparent sm:w-12 md:w-16 lg:w-20 xl:w-24"
            aria-hidden="true"
          />

          <div
            ref={scrollContainerRef}
            className="scrollbar-hide flex w-full overflow-x-auto select-none"
          >
            <div className="news-press-marquee-track flex items-center">
              <div className="flex shrink-0 items-center">
                {repeatedItems.map((item, idx) => (
                  <NewsLogoItem
                    key={`press-item-${item._id || idx}-${idx}`}
                    item={item}
                  />
                ))}
              </div>

              <div className="flex shrink-0 items-center" aria-hidden="true">
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

        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Next press logo"
          className="relative z-20 hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[#737373] shadow-xs transition-all duration-200 hover:scale-105 hover:border-black hover:text-black focus:outline-hidden active:scale-95 sm:flex md:h-10 md:w-10 lg:h-11 lg:w-11 xl:h-12 xl:w-12"
        >
          <IoChevronForward className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
      </div>
    </section>
  )
}
