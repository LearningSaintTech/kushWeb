export const ROUTES = {
  HOME: '/',
  CART: '/cart',
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

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
