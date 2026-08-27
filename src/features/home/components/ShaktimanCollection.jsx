import { Link } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import ShaktimanPromoBanner from './ShaktimanPromoBanner.jsx'

/**
 * Shaktiman limited-edition promo — full banner visible (no crop).
 * CTA → /collections/shaktiman
 */
export default function ShaktimanCollection() {
  const exploreTo = ROUTES.SHAKTIMAN_COLLECTION

  return (
    <section
      className="w-full overflow-x-hidden bg-black"
      aria-label="Shaktiman limited edition collection"
    >
      <div className="relative mx-auto w-full max-w-[1920px]">
        <ShaktimanPromoBanner loading="lazy" />

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
