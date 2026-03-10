export const ROUTES = {
  HOME: '/',
  CART: '/cart',
  WISHLIST: '/wishlist',
  PRODUCT: '/product/:id',
  AUTH: '/auth',
  CHECKOUT: '/checkout',
  SEARCH: '/search',
  /** Section explore (Explore More from home sections): /section/:sectionId */
  SECTION_EXPLORE: '/section/:sectionId',
  ACCOUNT: '/account',
  ORDERS: '/orders',
  /** Track single order item: /orders/track/:orderId/:itemId */
  ORDER_TRACK: '/orders/track/:orderId/:itemId',
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
}

/** Build product URL: getProductPath('123') => '/product/123' */
export function getProductPath(id) {
  return `/product/${id}`
}

/** Build section explore URL: getSectionExplorePath('sectionId') => '/section/sectionId' */
export function getSectionExplorePath(sectionId) {
  return sectionId ? `/section/${sectionId}` : '/search'
}

/** Build order track URL: getOrderTrackPath('ORD-123', 'itemId') => '/orders/track/ORD-123/itemId' */
export function getOrderTrackPath(orderId, itemId) {
  return orderId && itemId ? `/orders/track/${orderId}/${itemId}` : ROUTES.ORDERS
}
