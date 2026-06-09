import { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import { getPaymentModeLabel } from '../../utils/paymentMode'
import { trackOrderConversion } from './orderConversion.js'

function formatRs(num) {
  if (num == null || Number.isNaN(num)) return 'Rs 0'
  return `Rs ${Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`
}

export default function ThankYouPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const orderId = location.state?.orderId
  const paymentMode = location.state?.paymentMode
  const conversion = location.state?.conversion

  const orderValue = conversion?.value ?? 0
  const itemCount = conversion?.numItems ?? conversion?.items?.length ?? 0

  const paymentLabel = useMemo(
    () => (paymentMode ? getPaymentModeLabel({ paymentMode }) : null),
    [paymentMode],
  )

  useEffect(() => {
    if (!orderId) {
      navigate(ROUTES.HOME, { replace: true })
      return
    }
    if (conversion) {
      trackOrderConversion(conversion)
    }
  }, [orderId, conversion, navigate])

  if (!orderId) return null

  return (
    <>
      <Helmet>
        <title>Thank You | Khush</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div
        id="order-thank-you"
        className="min-h-screen bg-gray-50 pt-28 pb-16 font-inter text-black"
        data-order-id={orderId}
        data-order-value={orderValue}
        data-currency={conversion?.currency || 'INR'}
        data-item-count={itemCount}
      >
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-black px-6 py-8 text-center sm:px-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                <svg
                  className="h-7 w-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-white sm:text-2xl">
                Thank You
              </h1>
              <p className="mt-3 text-sm text-white/80 sm:text-base">
                Thank you for ordering from Khush.
              </p>
            </div>

            <div className="space-y-6 px-6 py-8 sm:px-10">
              <p className="text-center text-sm leading-relaxed text-gray-600 sm:text-base">
                Your order has been placed successfully. We&apos;ll keep you updated on shipping
                and delivery.
              </p>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                <dl className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <dt className="font-medium uppercase tracking-wider text-gray-500">
                      Order ID
                    </dt>
                    <dd className="font-mono font-semibold text-gray-900">{orderId}</dd>
                  </div>
                  {paymentLabel && (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <dt className="font-medium uppercase tracking-wider text-gray-500">
                        Payment
                      </dt>
                      <dd className="font-medium text-gray-900">{paymentLabel}</dd>
                    </div>
                  )}
                  {orderValue > 0 && (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <dt className="font-medium uppercase tracking-wider text-gray-500">
                        Order total
                      </dt>
                      <dd className="font-semibold text-gray-900">{formatRs(orderValue)}</dd>
                    </div>
                  )}
                  {itemCount > 0 && (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <dt className="font-medium uppercase tracking-wider text-gray-500">
                        Items
                      </dt>
                      <dd className="font-medium text-gray-900">{itemCount}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={ROUTES.ORDERS}
                  className="flex min-h-11 flex-1 items-center justify-center bg-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-gray-800"
                >
                  View my orders
                </Link>
                <Link
                  to={ROUTES.SEARCH}
                  className="flex min-h-11 flex-1 items-center justify-center border border-black px-6 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-gray-50"
                >
                  Continue shopping
                </Link>
              </div>

              <p className="text-center text-xs text-gray-500">
                Need help?{' '}
                <Link to={ROUTES.CONTACT_US} className="font-medium text-black underline-offset-2 hover:underline">
                  Contact us
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
