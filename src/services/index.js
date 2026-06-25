/**
 * API services – single entry for app usage.
 * Debug logs: VITE_APP_ENV=dev (all logs) | VITE_APP_ENV=prod (silent).
 */

export {
  API_BASE_URL,
  API_ORIGIN,
  BUILD_MODE,
  getSocketUrl,
  isDebug,
  warnIfProductionApiUrlMissing,
} from './config.js';
export {
  default as apiClient,
  ACCESS_TOKEN_KEY,
  setAccessTokenGetter,
  setOnUnauthorized,
  getCurrentAccessToken,
} from './axiosClient.js';

export { authService } from './auth.service.js';
export { itemsService } from './items.service.js';
export { categoriesService, subcategoriesService } from './categories.service.js';
export { cartService } from './cart.service.js';
export { wishlistService } from './wishlist.service.js';
export { addressService } from './address.service.js';
export { orderService } from './order.service.js';
export { cancellationService } from './cancellation.service.js';
export { exchangeService } from './exchange.service.js';
export { returnService } from './return.service.js';
export { policyService } from './policy.service.js';
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
export { contactUsService } from './contactUs.service.js';
export { faqService, faqApiMessage } from './faq.service.js';
export { walletService } from './wallet.service.js';
export { giftcardService } from './giftcard.service.js';
export { chatbotService } from './chatbot.service.js';
export { supportTicketService } from './supportTicket.service.js';
export { referralService, unwrapReferralResponse } from './referral.service.js';

export { getCurrentPosition, reverseGeocode, getCurrentLocationPincode } from './geo.service.js';
