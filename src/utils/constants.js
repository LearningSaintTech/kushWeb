export const ROUTES = {
  HOME: '/',
  CART: '/cart',
  WISHLIST: '/wishlist',
  PRODUCT: '/product/:id',
  AUTH: '/auth',
  CHECKOUT: '/checkout',
  SEARCH: '/search',
  ACCOUNT: '/account',
}

/** Build product URL: getProductPath('123') => '/product/123' */
export function getProductPath(id) {
  return `/product/${id}`
}
