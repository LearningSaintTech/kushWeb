import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from '../../shared/layout/MainLayout'
import { HomePage } from '../../features/home'
import { CartPage } from '../../features/cart'
import { WishlistPage } from '../../features/wishlist'
import { ProductPage } from '../../features/product'
import { AuthPage } from '../../features/auth'
import {
  CheckoutPage,
  ThankYouPage,
  OrderFailedPage,
  OrderCancelledPage,
} from '../../features/checkout'
import NimbleCallbackPage from '../../features/checkout/NimbleCallbackPage'
import { OrdersPage, TrackOrderPage } from '../../features/orders'
import { NotificationsPage } from '../../features/notifications'
import { SearchPage } from '../../features/search'
import { SectionExplorePage } from '../../features/sectionExplore'
import { CouponsPage } from '../../features/coupons'
import { WalletPage } from '../../features/wallet'
import { ReferEarnPage } from '../../features/referEarn'
import { CoinsPage } from '../../features/coins'
import { GiftCardPage } from '../../features/giftcard'
import {
  RefundCancelPolicyPage,
  PaymentPolicyPage,
  ShippingDeliveryPolicyPage,
  FAQsPage,
  AboutUsPage,
  ContactUsPage,
  TermsConditionsPage,
  PrivacyPolicyPage,
  DeleteAccountPage,
  ReturnPolicyPage,
} from '../../features/policy'
import Address from '../../shared/address/Address'
import ProfileUpdatePage from '../../features/account/ProfileUpdatePage'
import AccountPage from '../../features/account/AccountPage'
import AppDownloadRedirectPage from '../../shared/components/AppDownloadRedirectPage'
import { ROUTES } from '../../utils/constants'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'product/:slug/:id', element: <ProductPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'checkout/nimble/callback', element: <NimbleCallbackPage /> },
      { path: 'order/thank-you', element: <ThankYouPage /> },
      { path: 'order/failed', element: <OrderFailedPage /> },
      { path: 'order/cancelled', element: <OrderCancelledPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/track/:orderId/:itemId', element: <TrackOrderPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'section/:sectionId', element: <SectionExplorePage /> },
      { path: 'refund-cancel-policy', element: <RefundCancelPolicyPage /> },
      { path: 'return-policy', element: <ReturnPolicyPage /> },
      { path: 'payment-policy', element: <PaymentPolicyPage /> },
      { path: 'shipping-delivery-policy', element: <ShippingDeliveryPolicyPage /> },
      { path: 'faqs', element: <FAQsPage /> },
      { path: 'about-us', element: <AboutUsPage /> },
      { path: 'contact-us', element: <ContactUsPage /> },
      { path: 'terms-conditions', element: <TermsConditionsPage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'delete-account', element: <DeleteAccountPage /> },
      { path: 'address', element: <Address /> },
      { path: 'coupons', element: <CouponsPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'refer-earn', element: <ReferEarnPage /> },
      { path: 'redeem-coins', element: <CoinsPage /> },
      { path: 'giftcard', element: <GiftCardPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'account/profile-update', element: <ProfileUpdatePage /> },
    ],
  },
  { path: 'auth', element: <AuthPage /> },
  { path: 'app-download', element: <AppDownloadRedirectPage /> },
])

export default function Routes() {
  return <RouterProvider router={router} />
}
