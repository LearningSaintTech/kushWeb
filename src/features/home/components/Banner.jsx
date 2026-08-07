import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bannerService } from '../../../services/content.service.js'
import { getPublicImageUrl } from '../../../services/config.js'
import { ROUTES } from '../../../utils/constants'
import { useAuth } from '../../../app/context/AuthContext'
import { debugLog } from '../../../utils/debugLog'
import bannerDesktopPreview from '../../../assets/images/community/banners.jpeg'
import bannerMobilePreview from '../../../assets/images/community/banner mobile.jpg.jpeg'

/** TEMP preview — set to false to restore API video/banner */
const USE_LOCAL_BANNER_PREVIEW = false
const AUTOPLAY_MS = 5000

function DiamondDot({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'true' : undefined}
      className={`flex h-4 w-4 items-center justify-center transition-opacity ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <span
        className={`block h-2 w-2 rotate-45 border border-white ${
          active ? 'bg-white' : 'bg-transparent'
        }`}
      />
    </button>
  )
}

function FashionWeekOverlay({ slideCount, slideIndex, onSelectSlide, onExploreFashion }) {
  const showDots = slideCount > 1

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/55 via-black/25 to-transparent pt-24 pb-8 sm:pb-10 md:pb-12">
      <div className="pointer-events-auto px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="max-w-xl text-left text-white">
          {/* <p className="font-inter text-sm font-light tracking-[0.1em] text-white/95 sm:text-base md:text-xs lg:text-sm">
            KHUSH @2026
          </p> */}
          {/* <h2
            className="font-raleway font-bold uppercase leading-none text-white"
            style={{
              fontSize: '28px',
              letterSpacing: '-0.02em',
            }}
          >
            FASHION WEEK
          </h2> */}

          {showDots ? (
            <div
              className="mt-4 flex items-center gap-1.5 sm:mt-5"
              role="tablist"
              aria-label="Banner slides"
            >
              {Array.from({ length: slideCount }, (_, i) => (
                <DiamondDot
                  key={i}
                  active={i === slideIndex}
                  label={`Slide ${i + 1}`}
                  onClick={() => onSelectSlide?.(i)}
                />
              ))}
            </div>
          ) : null}

          {/* <button
            type="button"
            onClick={onExploreFashion}
            className="btn-shine mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border-3 border-white/80 bg-gradient-to-r from-black via-neutral-800 to-white/35 px-5 py-2.5 font-inter text-xs font-medium tracking-wide text-white shadow-sm transition hover:opacity-95 sm:mt-6 sm:px-6 sm:py-3 sm:text-sm"
          >
            <span>Explore Fashion</span>
            <span aria-hidden className="text-sm leading-none">
              ›
            </span>
          </button> */}
        </div>
      </div>
    </div>
  )
}

/* Mobile header is fixed + white; keep banner clear of it. */
const bannerShellClass =
  'relative w-full overflow-hidden max-md:mt-[7.25rem] max-md:aspect-[9/16] md:mt-0 md:aspect-auto md:h-[70vh] lg:h-screen'

const mediaClassName =
  'absolute inset-0 h-full w-full object-cover object-top md:object-center'

function mediaItems(source) {
  if (!source) return []
  if (source.url) return [{ url: source.url, key: source.key }]
  return Array.isArray(source.items)
    ? source.items.filter((item) => item?.url)
    : []
}

/**
 * Banner schema fields:
 * - desktopBanner.items[]        → website desktop carousel slides
 * - websiteMobileBanner.items[]  → website phone slides (paired by index)
 * - mobileBanner                 → native app only (ignored here)
 *
 * Homepage carousel = ONE banner document’s desktop items (not every banner flat-mapped).
 */
function mapBannerToSlides(banner) {
  if (!banner) return []

  const desktopItems = mediaItems(banner?.desktopBanner)
  const websiteMobileItems = mediaItems(banner?.websiteMobileBanner)
  // App-only (mobileBanner with no website media) → skip
  if (!desktopItems.length && !websiteMobileItems.length) return []

  // Desktop drives slide count. Do NOT Math.max with website/app lists — that created ghost slides.
  const leadItems = desktopItems.length ? desktopItems : websiteMobileItems
  const type =
    banner?.desktopBanner?.type ||
    banner?.websiteMobileBanner?.type ||
    'image'
  const bannerId = banner._id || banner.id || 'banner'

  return leadItems.map((lead, i) => {
    const desktop = desktopItems[i] || lead
    const websiteMobile = websiteMobileItems[i] || websiteMobileItems[0] || desktop

    return {
      id: `${bannerId}-${i}`,
      type,
      desktopUrl: getPublicImageUrl(desktop.url),
      mobileUrl: getPublicImageUrl(websiteMobile.url),
    }
  })
}

/** Prefer NORMAL home banners; otherwise newest with desktop (or website-mobile) media. */
function pickHomepageBanner(list) {
  const sorted = sortBanners(list)
  const withWebsiteMedia = sorted.filter(
    (b) =>
      mediaItems(b?.desktopBanner).length > 0 ||
      mediaItems(b?.websiteMobileBanner).length > 0,
  )
  if (!withWebsiteMedia.length) return null

  const normal = withWebsiteMedia.find(
    (b) => String(b?.type || '').toUpperCase() === 'NORMAL',
  )
  return normal || withWebsiteMedia[0]
}

function sortBanners(list) {
  return [...list].sort((a, b) => {
    const orderA = Number(a?.order ?? a?.priority ?? Number.POSITIVE_INFINITY)
    const orderB = Number(b?.order ?? b?.priority ?? Number.POSITIVE_INFINITY)
    if (orderA !== orderB) return orderA - orderB
    const timeA = new Date(a?.createdAt || a?.updatedAt || 0).getTime()
    const timeB = new Date(b?.createdAt || b?.updatedAt || 0).getTime()
    return timeB - timeA
  })
}

function SlideMedia({ slide, active, preferVideoAutoplay }) {
  if (!slide) return null

  const isVideo = slide.type === 'video'
  const layerClass = `absolute inset-0 overflow-hidden transition-opacity duration-500 ${
    active ? 'z-[1] opacity-100' : 'pointer-events-none z-0 opacity-0'
  }`

  if (isVideo) {
    return (
      <div className={layerClass} aria-hidden={!active}>
        <video
          src={slide.desktopUrl}
          autoPlay={preferVideoAutoplay && active}
          muted
          loop
          playsInline
          className={mediaClassName}
        />
      </div>
    )
  }

  return (
    <div className={layerClass} aria-hidden={!active}>
      <picture className="absolute inset-0 block h-full w-full">
        <source media="(min-width: 768px)" srcSet={slide.desktopUrl} />
        <img
          src={slide.mobileUrl}
          alt=""
          className={`${mediaClassName} max-w-none`}
          draggable={false}
        />
      </picture>
    </div>
  )
}

const Banner = () => {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const [slides, setSlides] = useState([])
  const [slideIndex, setSlideIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const handleExploreFashion = () => {
    debugLog('[CommunityProfile] Explore Fashion clicked', {
      authChecked,
      isAuthenticated,
    })
    if (!authChecked) return
    if (!isAuthenticated) {
      openAuthModal(ROUTES.COMMUNITY_ENTER)
      return
    }
    navigate(ROUTES.COMMUNITY_ENTER)
  }

  useEffect(() => {
    if (USE_LOCAL_BANNER_PREVIEW) {
      setLoaded(true)
      return
    }
    let cancelled = false
    bannerService
      .getAll({ isActive: true, limit: 20, page: 1 })
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res?.data?.data?.banners)
          ? res.data.data.banners
          : []
        const primary = pickHomepageBanner(list)
        const nextSlides = mapBannerToSlides(primary)

        debugLog('[Banner] slides', {
          apiCount: list.length,
          primaryId: primary?._id || primary?.id,
          primaryTitle: primary?.title,
          slideCount: nextSlides.length,
          desktopItems: mediaItems(primary?.desktopBanner).length,
          websiteMobileItems: mediaItems(primary?.websiteMobileBanner).length,
          ignoredAppItems: mediaItems(primary?.mobileBanner).length,
        })
        setSlides(nextSlides)
        setSlideIndex(0)
      })
      .catch(() => {
        if (!cancelled) setSlides([])
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (slides.length < 2) return undefined
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [slides.length])

  useEffect(() => {
    if (slideIndex >= slides.length && slides.length > 0) {
      setSlideIndex(0)
    }
  }, [slides.length, slideIndex])

  if (USE_LOCAL_BANNER_PREVIEW) {
    return (
      <div className={bannerShellClass}>
        <picture>
          <source media="(min-width: 768px)" srcSet={bannerDesktopPreview} />
          <img
            src={bannerMobilePreview}
            alt="Fashion for everyday"
            className={mediaClassName}
          />
        </picture>
        <FashionWeekOverlay
          slideCount={1}
          slideIndex={0}
          onSelectSlide={setSlideIndex}
          onExploreFashion={handleExploreFashion}
        />
      </div>
    )
  }

  if (!loaded) {
    return <div className={`${bannerShellClass} bg-neutral-100`} aria-busy="true" />
  }

  if (!slides.length) {
    return (
      <div className={`${bannerShellClass} bg-neutral-100`}>
        <FashionWeekOverlay
          slideCount={0}
          slideIndex={0}
          onSelectSlide={setSlideIndex}
          onExploreFashion={handleExploreFashion}
        />
      </div>
    )
  }

  const isCarousel = slides.length > 1
  const activeIndex = Math.min(slideIndex, slides.length - 1)

  return (
    <div className={bannerShellClass} aria-roledescription={isCarousel ? 'carousel' : undefined}>
      {slides.map((slide, index) => (
        <SlideMedia
          key={slide.id || index}
          slide={slide}
          active={index === activeIndex}
          preferVideoAutoplay={!isCarousel || index === activeIndex}
        />
      ))}

      <FashionWeekOverlay
        slideCount={slides.length}
        slideIndex={activeIndex}
        onSelectSlide={setSlideIndex}
        onExploreFashion={handleExploreFashion}
      />
    </div>
  )
}

export default Banner
