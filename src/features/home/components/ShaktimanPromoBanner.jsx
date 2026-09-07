import {
  SHAKTIMAN_BANNER_DESKTOP,
  SHAKTIMAN_BANNER_MOBILE,
} from '../../../utils/shaktiman.js'

const BANNER_ALT =
  'Shaktimaan Collection is now live — for the hero in you'

/**
 * Shared Shaktimaan promo art: portrait on phone, landscape from lg up.
 * Accepts dynamic desktopUrl and mobileUrl from API with static local asset fallbacks.
 */
export default function ShaktimanPromoBanner({
  desktopUrl = '',
  mobileUrl = '',
  alt = BANNER_ALT,
  loading = 'lazy',
}) {
  const resolvedDesktop = desktopUrl || SHAKTIMAN_BANNER_DESKTOP
  const resolvedMobile = mobileUrl || desktopUrl || SHAKTIMAN_BANNER_MOBILE

  return (
    <picture className="block w-full">
      <source media="(min-width: 1024px)" srcSet={resolvedDesktop} />
      <img
        src={resolvedMobile}
        alt={alt}
        className="block h-auto w-full max-w-full object-contain object-center select-none"
        loading={loading}
        decoding="async"
        draggable={false}
      />
    </picture>
  )
}
