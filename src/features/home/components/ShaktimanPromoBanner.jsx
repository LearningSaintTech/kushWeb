import {
  SHAKTIMAN_BANNER_DESKTOP,
  SHAKTIMAN_BANNER_MOBILE,
} from '../../../utils/shaktiman.js'

const BANNER_ALT =
  'Shaktimaan Collection is now live — for the hero in you'

/**
 * Shared Shaktimaan promo art: portrait on phone, landscape from lg up.
 */
export default function ShaktimanPromoBanner({ loading = 'lazy' }) {
  return (
    <picture className="block w-full">
      <source media="(min-width: 1024px)" srcSet={SHAKTIMAN_BANNER_DESKTOP} />
      <img
        src={SHAKTIMAN_BANNER_MOBILE}
        alt={BANNER_ALT}
        className="block h-auto w-full max-w-full object-contain object-center select-none"
        loading={loading}
        decoding="async"
        draggable={false}
      />
    </picture>
  )
}
