export const ROUTES = {
  HOME: '/',
  CART: '/cart',
  WISHLIST: '/wishlist',
  PRODUCT: '/product/:slug/:id',
  AUTH: '/auth',
  CHECKOUT: '/checkout',
  SEARCH: '/search',
  /** Section explore (Explore More from home sections): /section/:sectionId */
  SECTION_EXPLORE: '/section/:sectionId',
  ACCOUNT: '/account',
  PROFILE_UPDATE: '/account/profile-update',
  ORDERS: '/orders',
  /** Track single order item: /orders/track/:orderId/:itemId */
  ORDER_TRACK: '/orders/track/:orderId/:itemId',
  NOTIFICATIONS: '/notifications',
  COUPONS: '/coupons',
  ADDRESS: '/address',
  REFUND_CANCEL_POLICY: '/refund-cancel-policy',
  PAYMENT_POLICY: '/payment-policy',
  SHIPPING_DELIVERY_POLICY: '/shipping-delivery-policy',
  FAQS: '/faqs',
  ABOUT_US: '/about-us',
  CONTACT_US: '/contact-us',
  TERMS_CONDITIONS: '/terms-conditions',
  PRIVACY_POLICY: '/privacy-policy',
  DELETE_ACCOUNT: '/delete-account',
}

function slugifyPart(value) {
  if (!value) return ''
  return String(value)
    .toLowerCase()
    .replace(/['".,!?()[\]{}:;@#$%^&*+=~`|\\/<>]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function toSlug(value) {
  return slugifyPart(value)
}

/**
 * Build SEO-friendly product URL.
 * - getProductPath('123') => '/product/123' (fallback)
 * - getProductPath('123', 'Elegant Cotton Kurti', 'Soft breathable fabric')
 *   => '/product/elegant-cotton-kurti-soft-breathable-fabric/123'
 */
export function getProductPath(id, name = '', shortDescription = '') {
  const idStr = id != null ? String(id) : ''
  if (!idStr) return '/product'
  const slug = `${slugifyPart(name)} `.trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!slug) return `/product/${idStr}`
  return `/product/${slug}/${idStr}`
}

/** Build search URL with ids + optional SEO slugs for category/subcategory. */
export function getSearchPath({
  sectionId,
  categoryId,
  subcategoryId,
  categoryName,
  subcategoryName,
} = {}) {
  const params = new URLSearchParams()
  if (sectionId) params.set('sectionId', String(sectionId))
  if (categoryId) params.set('categoryId', String(categoryId))
  if (subcategoryId) params.set('subcategoryId', String(subcategoryId))
  const categorySlug = toSlug(categoryName)
  const subcategorySlug = toSlug(subcategoryName)
  if (categorySlug) params.set('categorySlug', categorySlug)
  if (subcategorySlug) params.set('subcategorySlug', subcategorySlug)
  const q = params.toString()
  return q ? `${ROUTES.SEARCH}?${q}` : ROUTES.SEARCH
}

/** Build section explore URL: getSectionExplorePath('sectionId') => '/section/sectionId' */
export function getSectionExplorePath(sectionId) {
  return sectionId ? `/section/${sectionId}` : '/search'
}

/** Build order track URL: getOrderTrackPath('ORD-123', 'itemId') => '/orders/track/ORD-123/itemId' */
export function getOrderTrackPath(orderId, itemId) {
  return orderId && itemId ? `/orders/track/${orderId}/${itemId}` : ROUTES.ORDERS
}
