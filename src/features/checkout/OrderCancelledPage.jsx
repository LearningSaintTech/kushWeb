import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, getOrderTrackPath } from '../../utils/constants'
import { getPaymentModeLabel, isCodPayment } from '../../utils/paymentMode'
import OrderStatusShell from './OrderStatusShell.jsx'
import { trackOrderCancelledEvent } from './orderConversion.js'

export default function OrderCancelledPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const orderId = location.state?.orderId
  const itemId = location.state?.itemId
  const reason = location.state?.reason
  const paymentMode = location.state?.paymentMode
  const isCod = location.state?.isCod ?? isCodPayment({ paymentMode })

  useEffect(() => {
    if (!orderId) {
      navigate(ROUTES.ORDERS, { replace: true })
      return
    }
    trackOrderCancelledEvent({ orderId, itemId, reason, paymentMode })
  }, [orderId, itemId, reason, paymentMode, navigate])

  if (!orderId) return null

  const details = [
    { label: 'Order ID', value: orderId },
  ]
  if (itemId) {
    details.push({ label: 'Item ID', value: String(itemId) })
  }
  if (paymentMode) {
    details.push({ label: 'Payment', value: getPaymentModeLabel({ paymentMode }) })
  }
  if (reason) {
    details.push({ label: 'Reason', value: reason })
  }

  const trackPath =
    orderId && itemId ? getOrderTrackPath(orderId, itemId) : ROUTES.ORDERS

  return (
    <OrderStatusShell
      id="order-cancelled"
      variant="cancelled"
      helmetTitle="Order Cancelled | Khush"
      title="Order Cancelled"
      subtitle="Your order item has been cancelled."
      message={
        isCod
          ? 'This order item has been cancelled successfully.'
          : 'Your refund coupon will be added to your Coupons section within 24 hours.'
      }
      dataAttrs={{
        'data-order-id': orderId,
        'data-item-id': itemId || '',
        'data-reason': reason || '',
      }}
      details={details}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={ROUTES.ORDERS}
          className="flex min-h-11 flex-1 items-center justify-center bg-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-gray-800"
        >
          View my orders
        </Link>
        {!isCod ? (
          <Link
            to={ROUTES.COUPONS}
            className="flex min-h-11 flex-1 items-center justify-center border border-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-gray-50"
          >
            View coupons
          </Link>
        ) : (
          <Link
            to={ROUTES.SEARCH}
            className="flex min-h-11 flex-1 items-center justify-center border border-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-gray-50"
          >
            Continue shopping
          </Link>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">
        <Link
          to={trackPath}
          className="font-medium text-black underline-offset-2 hover:underline"
        >
          View order details
        </Link>
      </p>
    </OrderStatusShell>
  )
}
