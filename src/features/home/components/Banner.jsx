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
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/55 via-black/25 to-transparent pt-24 pb-8 sm:pb-10 md:pb-12">
      <div className="pointer-events-auto px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="max-w-xl text-left text-white">
          {/* <p className="font-inter text-sm font-normal font-weight-[300] tracking-[0.1em] text-white/95 sm:text-base md:text-xs lg:text-sm">
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
          </h2>  */}

          {slideCount > 1 && (
            <div className="mt-4 flex items-center gap-1.5 sm:mt-5" role="tablist" aria-label="Banner slides">
              {Array.from({ length: slideCount }, (_, i) => (
                <DiamondDot
                  key={i}
                  active={i === slideIndex}
                  label={`Slide ${i + 1}`}
                  onClick={() => onSelectSlide?.(i)}
                />
              ))}
            </div>
          )} 

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

/*Mobile header is fixed + white; keep banner clear of it. */
const bannerShellClass =
  'relative w-full overflow-hidden max-md:mt-[7.25rem] max-md:aspect-[9/16] md:mt-0 md:aspect-auto md:h-[70vh] lg:h-screen'

const mediaClassName =
  'absolute inset-0 h-full w-full object-cover object-top md:object-center'

function hasDesktopAsset(banner) {
  const db = banner?.desktopBanner
  if (!db) return false
  if (db.url && db.key) return true
  return Array.isArray(db.items) && db.items.some((item) => item?.url)
}

const Banner = () => {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const [desktopBanner, setDesktopBanner] = useState(null)

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
    if (USE_LOCAL_BANNER_PREVIEW) return
    let cancelled = false
    bannerService
      // Skip banners with empty desktop assets; prefer ones with real image URLs.
      .getAll({ isActive: true, limit: 10, page: 1 })
      .then((res) => {
        if (cancelled) return
        const list = res?.data?.data?.banners || []
        const banner = list.find(hasDesktopAsset)

        if (!banner?.desktopBanner) return

        const db = banner.desktopBanner
        // items[0] = desktop, items[1] = mobile (not a slider)
        const items = (db.items || []).filter((item) => item?.url).slice(0, 2)
        if (items.length) {
          setDesktopBanner({ type: db.type || 'image', items })
        } else if (db.url && db.key) {
          setDesktopBanner({ type: 'image', items: [{ url: db.url, key: db.key }] })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // TEMP: local desktop/mobile images for preview
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
          onExploreFashion={handleExploreFashion}
        />
      </div>
    )
  }

  if (!desktopBanner?.items?.length) {
    return (
      <div className={`${bannerShellClass} bg-neutral-100`}>
        <FashionWeekOverlay
          slideCount={0}
          slideIndex={0}
          onExploreFashion={handleExploreFashion}
        />
      </div>
    )
  }

  const isVideo = desktopBanner.type === 'video'
  const items = desktopBanner.items
  const desktopSrc = getPublicImageUrl(items[0].url)
  const mobileSrc = getPublicImageUrl((items[1] || items[0]).url)

  return (
    <div className={bannerShellClass}>
      {isVideo ? (
        <video
          src={desktopSrc}
          autoPlay
          muted
          loop
          playsInline
          className={mediaClassName}
        />
      ) : (
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrc} />
          <img src={mobileSrc} alt="" className={mediaClassName} />
        </picture>
      )}

      <FashionWeekOverlay
        slideCount={1}
        slideIndex={0}
        onExploreFashion={handleExploreFashion}
      />
    </div>
  )
}

export default Banner
