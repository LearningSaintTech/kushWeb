/**
 * API services – single entry for app usage.
 * Use debug mode (VITE_DEBUG=true or dev) to log requests/responses via axios interceptors.
 */

export { API_BASE_URL, isDebug } from './config.js';
export {
  default as apiClient,
  ACCESS_TOKEN_KEY,
  setAccessTokenGetter,
  setOnUnauthorized,
} from './axiosClient.js';

export { authService } from './auth.service.js';
export { itemsService } from './items.service.js';
export { categoriesService, subcategoriesService } from './categories.service.js';
export { cartService } from './cart.service.js';
export { wishlistService } from './wishlist.service.js';
export { addressService } from './address.service.js';
export { orderService } from './order.service.js';
export {
  bannerService,
  featuredImagesService,
  sectionsService,
} from './content.service.js';
export { couponsService } from './coupons.service.js';
export {
  servicablePincodeService,
  deliveryService,
  cartChargesService,
} from './delivery.service.js';
export { searchKeywordsService } from './search.service.js';
export { reviewsService } from './reviews.service.js';
export { brandsService } from './brands.service.js';
export { filtersService } from './filters.service.js';

export { getCurrentPosition, reverseGeocode, getCurrentLocationPincode } from './geo.service.js';
