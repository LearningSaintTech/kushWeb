import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-white px-4 py-8 text-gray-600">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Shop</h3>
            <ul className="space-y-2">
              <li><Link to={ROUTES.HOME} className="hover:text-gray-900">Home</Link></li>
              <li><Link to={ROUTES.SEARCH} className="hover:text-gray-900">Search</Link></li>
              <li><Link to={ROUTES.CART} className="hover:text-gray-900">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Account</h3>
            <ul className="space-y-2">
              <li><Link to={ROUTES.ACCOUNT} className="hover:text-gray-900">My Account</Link></li>
              <li><Link to={ROUTES.AUTH} className="hover:text-gray-900">Sign in</Link></li>
              <li><Link to={ROUTES.CHECKOUT} className="hover:text-gray-900">Checkout</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Help</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-gray-900">Contact</a></li>
              <li><a href="#" className="hover:text-gray-900">FAQs</a></li>
              <li><a href="#" className="hover:text-gray-900">Shipping</a></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-900">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-gray-900">Terms of Use</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm">
          <p>© {currentYear} KhushWeb. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
