import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bannerService } from '../../../services/content.service.js'
import { getPublicImageUrl } from '../../../services/config.js'
import { ROUTES, getSearchPath } from '../../../utils/constants'
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/60 via-black/25 to-transparent pt-20 pb-6 sm:pb-8 md:pb-10">
      <div className="pointer-events-auto px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="max-w-md text-left text-white">
          <p className="font-inter text-[11px] sm:text-xs font-normal uppercase tracking-[0.14em] text-white/90">
            KHUSH @2026
          </p>
          <h2 className="mt-0.5 font-inter text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-sm">
            FASHION WEEK
          </h2>

          <div
            className="mt-2.5 flex items-center gap-1.5 sm:mt-3"
            role="tablist"
            aria-label="Banner slides"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {showDots ? (
              Array.from({ length: slideCount }, (_, i) => (
                <DiamondDot
                  key={i}
                  active={i === slideIndex}
                  label={`Slide ${i + 1}`}
                  onClick={() => onSelectSlide?.(i)}
                />
              ))
            ) : (
              // 5 decorative diamond indicators matching user screenshot
              Array.from({ length: 5 }, (_, i) => (
                <DiamondDot key={i} active={i === 0} label={`Indicator ${i + 1}`} />
              ))
            )}
          </div>

          <div className="mt-4 sm:mt-4.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onExploreFashion?.()
              }}
              className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-white bg-black/85 px-4.5 py-1.5 sm:px-5 sm:py-2 font-inter text-xs sm:text-[13px] font-medium text-white shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-black active:scale-95"
            >
              {/* Subtle looping shine line */}
              <span
                className="pointer-events-none absolute inset-0 -top-1 -bottom-1 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-button-shine"
                aria-hidden
              />
              <span className="relative z-10">Explore Fashion</span>
              <span className="relative z-10 text-sm font-light leading-none transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                &rsaquo;
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Original banner dimensions restored */
const bannerShellClass =
  'relative w-full overflow-hidden max-md:mt-[7.25rem] max-md:aspect-[9/16] md:mt-0 md:aspect-auto md:h-[70vh] lg:h-screen'

const mediaClassName =
  'absolute inset-0 h-full w-full object-cover object-center max-lg:portrait:object-top'

function mediaItems(source) {
  if (!source) return []
  if (source.url) return [{ url: source.url, key: source.key }]
  return Array.isArray(source.items)
    ? source.items.filter((item) => item?.url)
    : []
}

function hasWebsiteMedia(banner) {
  return (
    mediaItems(banner?.desktopBanner).length > 0 ||
    mediaItems(banner?.websiteMobileBanner).length > 0
  )
}

function isShaktimanBanner(banner) {
  const title = String(banner?.title || '').toLowerCase()
  const nav = String(
    banner?.navigation?.navigate || banner?.navigation?.url || '',
  ).toLowerCase()
  return (
    title.includes('shaktimaan') ||
    title.includes('shaktiman') ||
    title.includes('shakti') ||
    nav.includes('shaktimaan') ||
    nav.includes('shaktiman') ||
    nav === 'shakti' ||
    nav.includes('/collections/shaktiman')
  )
}

/**
 * Resolve backend `navigation.navigate` → in-app path.
 * - Shaktiman banners → /collections/shaktiman
 * - Absolute http(s) / root path → use as-is
 * - Mongo-style id → /search?categoryId=… (e.g. Men banner)
 */
export function resolveBannerNavigatePath(banner) {
  if (!banner) return null
  if (isShaktimanBanner(banner)) return ROUTES.SHAKTIMAN_COLLECTION

  const raw = banner?.navigation?.navigate ?? banner?.navigation?.url ?? null
  if (raw == null || raw === '') return null

  const value = String(raw).trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return value

  const lower = value.toLowerCase()
  if (
    lower === 'shaktiman' ||
    lower === 'shaktimaan' ||
    lower === 'shakti'
  ) {
    return ROUTES.SHAKTIMAN_COLLECTION
  }

  if (banner?.categoryId) {
    return getSearchPath({ categoryId: banner.categoryId })
  }
  if (banner?.subcategoryId) {
    return getSearchPath({
      categoryId: banner.categoryId,
      subcategoryId: banner.subcategoryId,
    })
  }

  // Backend sends category ObjectId in navigation.navigate (Men example)
  return getSearchPath({ categoryId: value })
}

/**
 * Banner schema fields:
 * - desktopBanner.items[]        → website desktop carousel slides
 * - websiteMobileBanner.items[]  → website phone slides (paired by index)
 * - mobileBanner                 → native app only (ignored here)
 * - navigation.navigate          → destination id / path for click
 */
function mapBannerToSlides(banner) {
  if (!banner) return []

  const desktopItems = mediaItems(banner?.desktopBanner)
  const websiteMobileItems = mediaItems(banner?.websiteMobileBanner)
  if (!desktopItems.length && !websiteMobileItems.length) return []

  const leadItems = desktopItems.length ? desktopItems : websiteMobileItems
  const type =
    banner?.desktopBanner?.type ||
    banner?.websiteMobileBanner?.type ||
    'image'
  const bannerId = banner._id || banner.id || 'banner'
  const href = resolveBannerNavigatePath(banner)

  return leadItems.map((lead, i) => {
    const desktop = desktopItems[i] || lead
    const websiteMobile =
      websiteMobileItems[i] || websiteMobileItems[0] || desktop

    return {
      id: `${bannerId}-${i}`,
      bannerId,
      title: banner.title || '',
      type,
      desktopUrl: getPublicImageUrl(desktop.url),
      mobileUrl: getPublicImageUrl(websiteMobile.url),
      href,
      navigateTarget: banner?.navigation?.navigate ?? null,
    }
  })
}

/** All NORMAL banners with website media (carousel). Fallback: first usable banner. */
function pickHomepageBanners(list) {
  const sorted = sortBanners(list)
  const withWebsiteMedia = sorted.filter(hasWebsiteMedia)
  if (!withWebsiteMedia.length) return []

  const normals = withWebsiteMedia.filter(
    (b) => String(b?.type || '').toUpperCase() === 'NORMAL',
  )
  return normals.length ? normals : [withWebsiteMedia[0]]
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
        <source media="(min-width: 1024px)" srcSet={slide.desktopUrl} />
        <img
          src={slide.mobileUrl}
          alt=""
          className={mediaClassName}
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
  /** Bump after rotate so Samsung browsers recompute aspect/object-fit (avoids sticky distortion). */
  const [layoutEpoch, setLayoutEpoch] = useState(0)

  const handleExploreFashion = () => {
    debugLog('[CommunityProfile] Explore Fashion clicked')
    const userAgent =
      typeof navigator !== 'undefined'
        ? navigator.userAgent || navigator.vendor || window.opera || ''
        : ''
    const isMobile =
      /android|iPad|iPhone|iPod|windows phone/i.test(userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 768)

    if (isMobile) {
      if (/android/i.test(userAgent)) {
        window.location.href =
          'https://play.google.com/store/apps/details?id=com.khushpehno.app'
        return
      }
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        window.location.href =
          'https://apps.apple.com/in/app/khush-fashion-shopping-app/id6761365897'
        return
      }
      // General mobile fallback
      window.location.href =
        'https://play.google.com/store/apps/details?id=com.khushpehno.app'
      return
    }

    // Desktop / laptop: if registered/authenticated with profile, navigate directly to feed
    if (isAuthenticated) {
      navigate(ROUTES.COMMUNITY_FEED)
      return
    }
    if (!authChecked) {
      navigate(ROUTES.COMMUNITY_ENTER)
      return
    }
    openAuthModal(ROUTES.COMMUNITY_FEED)
  }

  const handleBannerClick = () => {
    const slide = slides[Math.min(slideIndex, slides.length - 1)]
    const href = slide?.href
    if (!href) return

    debugLog('[Banner] navigate', {
      title: slide?.title,
      navigateTarget: slide?.navigateTarget,
      href,
    })

    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href)
      return
    }
    navigate(href)
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
        const banners = pickHomepageBanners(list)
        const nextSlides = banners.flatMap((b) => mapBannerToSlides(b))

        debugLog('[Banner] slides', {
          apiCount: list.length,
          normalCount: banners.length,
          slideCount: nextSlides.length,
          slides: nextSlides.map((s) => ({
            id: s.id,
            title: s.title,
            href: s.href,
            navigateTarget: s.navigateTarget,
          })),
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

  // Portrait ↔ landscape: force a layout pass after chrome/viewport settles
  useEffect(() => {
    let timer = null
    const bump = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        setLayoutEpoch((n) => n + 1)
      }, 160)
    }
    window.addEventListener('orientationchange', bump)
    // Some Samsung WebViews only fire resize, not orientationchange
    const mq = window.matchMedia('(orientation: landscape)')
    const onMq = () => bump()
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq)
    else mq.addListener(onMq)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('orientationchange', bump)
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMq)
      else mq.removeListener(onMq)
    }
  }, [])

  if (USE_LOCAL_BANNER_PREVIEW) {
    return (
      <div key={`banner-preview-${layoutEpoch}`} className={bannerShellClass}>
        <picture>
          <source media="(min-width: 1024px)" srcSet={bannerDesktopPreview} />
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
    return (
      <div
        key={`banner-loading-${layoutEpoch}`}
        className={`${bannerShellClass} bg-neutral-100`}
        aria-busy="true"
      />
    )
  }

  if (!slides.length) {
    return (
      <div key={`banner-empty-${layoutEpoch}`} className={`${bannerShellClass} bg-neutral-100`}>
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
  const activeHref = slides[activeIndex]?.href
  const clickable = Boolean(activeHref)

  return (
    <div
      key={`banner-${layoutEpoch}`}
      className={`${bannerShellClass}${clickable ? ' cursor-pointer' : ''}`}
      aria-roledescription={isCarousel ? 'carousel' : undefined}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleBannerClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleBannerClick()
              }
            }
          : undefined
      }
      aria-label={
        clickable
          ? `Open ${slides[activeIndex]?.title || 'banner'}`
          : undefined
      }
    >
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
