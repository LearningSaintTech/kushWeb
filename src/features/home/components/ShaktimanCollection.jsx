import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { sectionsService } from '../../../services/content.service.js'
import { isShaktimanSection, getSectionBannerUrls } from '../../../utils/shaktiman.js'
import { debugError } from '../../../utils/debugLog.js'
import saktimanBanner from '../../../assets/images/navbar/Shakbanners.PNG'

/**
 * Shaktiman limited-edition promo — dynamic banner from API with static fallback.
 * Full banner visible (no crop).
 * CTA → /collections/shaktiman
 */
export default function ShaktimanCollection({ section: sectionProp = null }) {
  const [section, setSection] = useState(sectionProp)
  const exploreTo = ROUTES.SHAKTIMAN_COLLECTION

  useEffect(() => {
    if (sectionProp) {
      setSection(sectionProp)
      return
    }

    let cancelled = false
    sectionsService
      .getActive({ isWeb: true, limit: 30 })
      .then((res) => {
        if (cancelled) return
        const items = res?.data?.data?.items ?? res?.data?.items ?? []
        const match = items.find(isShaktimanSection)
        if (match) {
          setSection(match)
        }
      })
      .catch((err) => {
        debugError('[ShaktimanCollection] failed to load section', err?.message)
      })

    return () => {
      cancelled = true
    }
  }, [sectionProp])

  const { desktopUrl, mobileUrl } = getSectionBannerUrls(section)
  const resolvedDesktop = desktopUrl || mobileUrl || saktimanBanner
  const resolvedMobile = mobileUrl || desktopUrl || saktimanBanner

  return (
    <section
      className="w-full overflow-x-hidden bg-black"
      aria-label="Shaktiman limited edition collection"
    >
      <div className="relative mx-auto w-full max-w-[1920px]">
        <picture className="block w-full">
          {resolvedMobile && resolvedMobile !== resolvedDesktop ? (
            <source media="(max-width: 767px)" srcSet={resolvedMobile} />
          ) : null}
          <img
            src={resolvedDesktop}
            alt={
              section?.title ||
              'Shaktiman limited edition — Unleash Your Inner Hero. Hoodies, t-shirts, joggers and accessories.'
            }
            className="block h-auto w-full max-w-full object-contain object-center select-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </picture>

        <Link
          to={exploreTo}
          className="absolute bottom-[4%] right-[3%] z-10 inline-flex min-h-[36px] min-w-[42%] max-w-[280px] cursor-pointer items-center justify-center rounded-full border border-transparent bg-transparent px-3 py-2 font-inter text-[10px] font-semibold uppercase tracking-[0.12em] text-transparent outline-none transition hover:border-white/40 hover:bg-white/10 focus-visible:border-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/70 sm:min-h-[44px] sm:min-w-[38%] sm:text-xs md:bottom-[5%] md:right-[4%] md:min-w-[28%] md:max-w-[320px] md:text-sm lg:min-w-[22%] xl:min-w-[18%]"
          aria-label="Explore the Shaktiman collection"
        >
          Explore the collection
        </Link>

        <Link
          to={exploreTo}
          className="absolute inset-0 z-0"
          aria-hidden
          tabIndex={-1}
        />
      </div>
    </section>
  )
}

