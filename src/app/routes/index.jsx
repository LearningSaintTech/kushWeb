import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from '../../shared/layout/MainLayout'
import { HomePage } from '../../features/home'
import { CartPage } from '../../features/cart'
import { ProductPage } from '../../features/product'
import { AuthPage } from '../../features/auth'
import { CheckoutPage } from '../../features/checkout'
import { SearchPage } from '../../features/search'
import { AccountPage } from '../../features/account'
import { ROUTES } from '../../utils/constants'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'account', element: <AccountPage /> },
    ],
  },
  { path: 'auth', element: <AuthPage /> },
])

export default function Routes() {
  return <RouterProvider router={router} />
}
