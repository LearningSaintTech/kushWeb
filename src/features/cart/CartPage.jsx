import { Link } from 'react-router-dom'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { ROUTES } from '../../utils/constants'

function CartPage() {
  const { cart, removeFromCart, cartCount } = useCartWishlist()

  const total = cart.reduce((sum, item) => {
    const price = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0
    return sum + price * (item.quantity || 1)
  }, 0)

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-gray-600">Add items from the shop to get started.</p>
        <Link
          to={ROUTES.SEARCH}
          className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Cart ({cartCount} items)</h1>

      <div className="space-y-6">
        {cart.map((item) => {
          const price = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0
          const subtotal = price * (item.quantity || 1)
          return (
            <div
              key={item.id}
              className="flex gap-4 p-4 border border-gray-200 rounded-lg bg-white"
            >
              <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {item.image && (
                  <img
                    src={typeof item.image === 'string' ? item.image : item.image?.src}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{item.title}</h2>
                <p className="text-gray-600 text-sm mt-0.5">{item.price}</p>
                <p className="text-gray-500 text-sm">Qty: {item.quantity || 1}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-gray-900">
                  ₹{subtotal.toFixed(2)}
                </p>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 border-t border-gray-200">
        <p className="text-lg font-bold text-gray-900">
          Total: ₹{total.toFixed(2)}
        </p>
        <Link
          to={ROUTES.CHECKOUT}
          className="mt-4 inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  )
}

export default CartPage
