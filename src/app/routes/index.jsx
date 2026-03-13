import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from '../../shared/layout/MainLayout'
import { HomePage } from '../../features/home'
import { CartPage } from '../../features/cart'
import { WishlistPage } from '../../features/wishlist'
import { ProductPage } from '../../features/product'
import { AuthPage } from '../../features/auth'
import { CheckoutPage } from '../../features/checkout'
import { OrdersPage, TrackOrderPage } from '../../features/orders'
import { NotificationsPage } from '../../features/notifications'
import { SearchPage } from '../../features/search'
import { SectionExplorePage } from '../../features/sectionExplore'
import { CouponsPage } from '../../features/coupons'
import {
  RefundCancelPolicyPage,
  PaymentPolicyPage,
  ShippingDeliveryPolicyPage,
  FAQsPage,
  AboutUsPage,
  ContactUsPage,
  TermsConditionsPage,
  PrivacyPolicyPage,
} from '../../features/policy'
import Address from '../../shared/address/Address'
import ProfileUpdatePage from '../../features/account/ProfileUpdatePage'
import { ROUTES } from '../../utils/constants'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/track/:orderId/:itemId', element: <TrackOrderPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'section/:sectionId', element: <SectionExplorePage /> },
      { path: 'refund-cancel-policy', element: <RefundCancelPolicyPage /> },
      { path: 'payment-policy', element: <PaymentPolicyPage /> },
      { path: 'shipping-delivery-policy', element: <ShippingDeliveryPolicyPage /> },
      { path: 'faqs', element: <FAQsPage /> },
      { path: 'about-us', element: <AboutUsPage /> },
      { path: 'contact-us', element: <ContactUsPage /> },
      { path: 'terms-conditions', element: <TermsConditionsPage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'address', element: <Address /> },
      { path: 'coupons', element: <CouponsPage /> },
      { path: 'account/profile-update', element: <ProfileUpdatePage /> },
    ],
  },
  { path: 'auth', element: <AuthPage /> },
])

export default function Routes() {
  return <RouterProvider router={router} />
}
