import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { paymentService } from '../../services/payment.service.js'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { ROUTES } from '../../utils/constants'
import { PAYMENT_MODES } from '../../utils/paymentMode'

import { buildNimbblVerifyBody } from './paymentCheckout.js'

/**
 * Return URL after Nimble / Nimbbl Sonic checkout (redirect flow).
 * Query params vary by provider — we forward the full query to verify API.
 */
export default function NimbleCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refetchCart } = useCartWishlist()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Confirming your payment…')

  useEffect(() => {
    const queryPayload = Object.fromEntries(searchParams.entries())
    if (!Object.keys(queryPayload).length) {
      setStatus('error')
      setMessage('Missing payment details. Please check My Orders or contact support.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const payload = buildNimbblVerifyBody(queryPayload, {
          businessOrderId: queryPayload.invoice_id ?? queryPayload.order_id,
        })
        const res = await paymentService.verifyNimblePayment(payload)
        const data = res?.data?.data ?? res?.data
        const order = data?.order ?? data
        const orderId = order?.orderId
        if (cancelled) return
        await refetchCart()
        setStatus('success')
        setMessage('Payment confirmed! Redirecting to your orders…')
        setTimeout(() => {
          navigate(ROUTES.ORDERS, {
            state: { orderId, orderSuccess: true, paymentMode: PAYMENT_MODES.NIMBLE },
            replace: true,
          })
        }, 1200)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage(err?.response?.data?.message ?? err?.message ?? 'Payment verification failed.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, navigate, refetchCart])

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold uppercase tracking-wider text-black mb-3">
        {status === 'loading' ? 'Processing payment' : status === 'success' ? 'Payment successful' : 'Payment issue'}
      </h1>
      <p className="text-sm text-gray-600 max-w-md mb-6">{message}</p>
      {status === 'error' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={ROUTES.CHECKOUT}
            className="px-5 py-2.5 text-xs font-semibold uppercase border border-black text-black hover:bg-gray-50"
          >
            Back to checkout
          </Link>
          <Link
            to={ROUTES.ORDERS}
            className="px-5 py-2.5 text-xs font-semibold uppercase bg-black text-white"
          >
            My orders
          </Link>
        </div>
      )}
    </div>
  )
}
