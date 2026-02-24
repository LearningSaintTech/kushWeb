import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from '../../shared/layout/MainLayout'
import { HomePage } from '../../features/home'
import { CartPage } from '../../features/cart'
import { WishlistPage } from '../../features/wishlist'
import { ProductPage } from '../../features/product'
import { AuthPage } from '../../features/auth'
import { CheckoutPage } from '../../features/checkout'
import { SearchPage } from '../../features/search'
import { SectionExplorePage } from '../../features/sectionExplore'
import { AccountPage } from '../../features/account'
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
      { path: 'search', element: <SearchPage /> },
      { path: 'section/:sectionId', element: <SectionExplorePage /> },
      { path: 'account', element: <AccountPage /> },
    ],
  },
  { path: 'auth', element: <AuthPage /> },
])

export default function Routes() {
  return <RouterProvider router={router} />
}
