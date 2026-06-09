import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import { getPaymentModeLabel } from '../../utils/paymentMode'
import OrderStatusShell from './OrderStatusShell.jsx'
import { trackOrderFailedEvent } from './orderConversion.js'

const REASON_COPY = {
  payment_failed: 'Your payment could not be completed.',
  payment_cancelled: 'Payment was cancelled before completion.',
  payment_incomplete: 'Payment was not completed. You can try again from checkout.',
  verification_failed: 'We could not verify your payment.',
  order_create_failed: 'We could not place your order.',
}

export default function OrderFailedPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const orderId = location.state?.orderId
  const paymentMode = location.state?.paymentMode
  const reason = location.state?.reason || 'payment_failed'
  const message =
    location.state?.message ||
    REASON_COPY[reason] ||
    'Something went wrong while placing your order.'

  useEffect(() => {
    trackOrderFailedEvent({
      orderId,
      paymentMode,
      reason,
      message,
    })
  }, [orderId, paymentMode, reason, message])

  const details = []
  if (orderId) {
    details.push({ label: 'Order ID', value: orderId })
  }
  if (paymentMode) {
    details.push({ label: 'Payment', value: getPaymentModeLabel({ paymentMode }) })
  }
  if (reason) {
    details.push({
      label: 'Status',
      value: String(reason).replace(/_/g, ' '),
    })
  }

  return (
    <OrderStatusShell
      id="order-failed"
      variant="failed"
      helmetTitle="Order Failed | Khush"
      title="Order Not Completed"
      subtitle="We couldn't complete your order."
      message={message}
      dataAttrs={{
        'data-order-id': orderId || '',
        'data-reason': reason,
        'data-payment-mode': paymentMode || '',
      }}
      details={details}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={ROUTES.CHECKOUT}
          className="flex min-h-11 flex-1 items-center justify-center bg-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-gray-800"
        >
          Try again
        </Link>
        <button
          type="button"
          onClick={() => navigate(ROUTES.CART)}
          className="flex min-h-11 flex-1 items-center justify-center border border-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-gray-50"
        >
          Back to cart
        </button>
      </div>

      {orderId ? (
        <p className="text-center text-xs text-gray-500">
          Already charged?{' '}
          <Link
            to={ROUTES.ORDERS}
            className="font-medium text-black underline-offset-2 hover:underline"
          >
            Check my orders
          </Link>
        </p>
      ) : (
        <p className="text-center text-xs text-gray-500">
          Need help?{' '}
          <Link
            to={ROUTES.CONTACT_US}
            className="font-medium text-black underline-offset-2 hover:underline"
          >
            Contact us
          </Link>
        </p>
      )}
    </OrderStatusShell>
  )
}
