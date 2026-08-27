/** Keywords used for Shaktiman collection search / section matching. */
export const SHAKTIMAN_KEYWORDS = ['shaktiman', 'shakti man', 'shakti', 'shaktimaan']

function publicFileUrl(filename) {
  return `/${String(filename)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')}`
}

/** `public/` assets — mobile portrait + desktop landscape. */
export const SHAKTIMAN_BANNER_MOBILE = publicFileUrl(
  'phone responsive INDIA banner.jpg.jpeg',
)
export const SHAKTIMAN_BANNER_DESKTOP = publicFileUrl(
  "sneha's banner bank.jpg.jpeg",
)
