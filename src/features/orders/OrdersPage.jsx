import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { orderService } from '../../services/order.service.js'
import { ROUTES, getOrderTrackPath } from '../../utils/constants'

function formatPrice(num) {
  if (num == null || Number.isNaN(num)) return 'Rs. 0.00'
  return `Rs. ${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatStatusDate(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = days[d.getDay()]
  const date = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day.toUpperCase()}, ${date} ${month.toUpperCase()} ${year}`
}

function formatOrderDateTime(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const h = d.getHours() % 12 || 12
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
  return `${date} ${month} ${year}, ${h}:${min} ${ampm}`
}

function getPaymentModeLabel(oi) {
  const mode = oi?.payment?.mode ?? oi?.item?.paymentMode ?? ''
  if (mode === 'COD') return 'Cash on Delivery'
  if (mode === 'RAZORPAY' || mode === 'PREPAID') return 'Prepaid'
  return mode || '—'
}

function OrdersPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const orderIdFromState = location.state?.orderId
  const orderSuccessFromState = location.state?.orderSuccess

  const [orderItems, setOrderItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    const params = { page: 1, limit: 20 }
    orderService
      .getOrderItems(params)
      .then((res) => {
        console.log("res",res)
        const data = res?.data?.data ?? res?.data
        const items = data?.items ?? data ?? []
        const pag = data?.pagination ?? null
        setOrderItems(Array.isArray(items) ? items : [])
        setPagination(pag)
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load orders')
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  /** Map backend status to display label (lifecycle order) */
  const getStatusLabel = (status) => {
    const s = (status ?? '').toUpperCase()
    const map = {
      CREATED: 'Order placed',
      CONFIRMED: 'Confirmed',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      OUT_FOR_DELIVERY: 'Out for delivery',
      DELIVERED: 'Delivered',
      EXCHANGE_DELIVERED: 'Exchange Delivered',
      EXCHANGE_REQUESTED: 'Exchange requested',
      EXCHANGE_APPROVED: 'Exchange approved',
      EXCHANGE_REJECTED: 'Exchange rejected',
      EXCHANGE_PICKUP_SCHEDULED: 'Pickup scheduled',
      EXCHANGE_OUT_FOR_PICKUP: 'Out for pickup',
      EXCHANGE_PICKED: 'Picked for exchange',
      EXCHANGE_RECEIVED: 'Exchange received',
      EXCHANGE_PROCESSING: 'Exchange processing',
      EXCHANGE_SHIPPED: 'Exchange shipped',
      EXCHANGE_OUT_FOR_DELIVERY: 'Out for delivery',
      EXCHANGE_COMPLETED: 'Exchanged',
      CANCELLED: 'Cancelled',
    }
    return map[s] || s || '—'
  }

  const getStatusDisplay = (oi) => {
    const status = (oi.status ?? oi.itemStatus ?? '').toUpperCase()
    const address = oi.address ?? {}
    const name = address?.name ?? '—'
    const fullAddress = address?.fullAddress ?? address?.addressLine ?? '—'
    const deliveredAt = oi.item?.deliveredAt ?? oi.latestStatusHistory?.createdAt ?? oi.orderCreatedAt
    const dateStr = formatStatusDate(deliveredAt || oi.orderCreatedAt)
    const statusLabel = getStatusLabel(status)

    if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(status)) {
      return {
        type: 'track',
        label: 'TRACK ORDER',
        statusLabel,
      }
    }
    if (status === 'DELIVERED') {
      return { type: 'delivered', label: 'DELIVERED ON', statusLabel, dateStr, name, fullAddress }
    }
    if (status === 'EXCHANGE_DELIVERED') {
      return { type: 'exchange_process', label: 'EXCHANGE DELIVERED', statusLabel, dateStr, name, fullAddress }
    }
    if (['EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_REJECTED', 'EXCHANGE_PICKUP_SCHEDULED', 'EXCHANGE_OUT_FOR_PICKUP', 'EXCHANGE_PICKED', 'EXCHANGE_RECEIVED', 'EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED', 'EXCHANGE_OUT_FOR_DELIVERY'].includes(status)) {
      return { type: 'exchange_process', label: 'EXCHANGE IN PROCESS', statusLabel, dateStr, name, fullAddress }
    }
    if (status === 'EXCHANGE_COMPLETED') {
      return { type: 'exchanged', label: 'EXCHANGED', statusLabel, dateStr, name, fullAddress }
    }
    if (status === 'CANCELLED') {
      return { type: 'cancelled', label: 'CANCELLED', statusLabel, dateStr, name, fullAddress }
    }
    return { type: 'other', label: statusLabel, statusLabel, dateStr, name, fullAddress }
  }

  /** Latest orders first */
  const sortedOrderItems = [...orderItems].sort((a, b) => {
    const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0
    const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0
    return dateB - dateA
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className=" px-4 sm:px-6 py-12 sm:py-16 text-center ">
          <h1 className="text-xl sm:text-2xl font-bold text-black uppercase">My orders</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Please sign in to view your orders.</p>
          <Link to={ROUTES.AUTH} className="mt-6 inline-block px-6 py-3 bg-black text-white text-sm font-medium uppercase hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-12 font-sans">
      <div className=" px-4 sm:px-6 md:px-8 ">
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-gray-800 mb-6 sm:mb-8">My orders</h1>

        {orderSuccessFromState && orderIdFromState && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 border border-green-200 bg-green-50 rounded-lg">
            <p className="font-semibold text-green-800 uppercase text-sm sm:text-base">Order placed successfully</p>
            <p className="mt-1 text-xs sm:text-sm text-gray-700">
              Order ID: <span className="font-mono font-medium">{orderIdFromState}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
              <Link to={ROUTES.SEARCH} className="inline-block px-4 py-2 bg-black text-white text-xs sm:text-sm font-medium uppercase hover:bg-gray-800">
                Continue shopping
              </Link>
              <Link to={ROUTES.HOME} className="inline-block px-4 py-2 border border-black text-black text-xs sm:text-sm font-medium uppercase hover:bg-gray-50">
                Back to home
              </Link>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading orders…</p>
        ) : orderItems.length === 0 ? (
          <p className="text-sm text-gray-500">You have no orders yet.</p>
        ) : (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Table header — hidden on mobile, grid on md+ */}
            <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-50 border-b border-gray-300 py-3 px-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2">Status</div>
            </div>

            {sortedOrderItems.map((oi, idx) => {
              const item = oi.item ?? {}
              const name = item?.name ?? 'Product'
              const brand = item?.brand ?? item?.productId ?? '—'
              const color = item?.variant?.color ?? ''
              const imageUrl = item?.variant?.imageUrl ?? ''
              const quantity = item?.quantity ?? 1
              const price = item?.finalPayable ?? item?.itemSubtotal ?? (item?.unitPrice ?? 0) * quantity
              const trackingId = oi.latestStatusHistory?.trackingId ?? null
              const statusDisplay = getStatusDisplay(oi)
              const orderId = oi.orderId ?? ''
              const itemId = oi.itemId?.toString?.() ?? oi.productItemId?.toString?.() ?? ''
              const rowKey = orderId && itemId ? `${orderId}-${itemId}-${idx}` : `row-${idx}`

              return (
                <div
                  key={rowKey}
                  className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 border-b border-gray-200 py-4 md:py-5 px-4 last:border-b-0"
                >
                  {/* Product */}
                  <div className="flex gap-3 sm:gap-4 min-w-0 md:col-span-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 overflow-hidden bg-gray-100 rounded">
                      {imageUrl ? (
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* <p className="font-bold text-gray-900 uppercase text-xs sm:text-sm truncate">{brand}</p> */}
                      <p className="text-gray-700 text-xs sm:text-sm mt-0.5 normal-case line-clamp-2">{name}{color ? ` ${color}` : ''}</p>
                      {trackingId && (
                        <p className="text-gray-500 text-[11px] sm:text-xs mt-1">Tracking ID: #{trackingId}</p>
                      )}
                    </div>
                  </div>

                  {/* Quantity + Price — row on mobile, separate cols on md+ */}
                  <div className="flex md:contents flex-wrap gap-x-4 gap-y-1">
                    <div className="md:col-span-2 flex items-center md:justify-center text-gray-800 text-sm">
                      <span className="md:hidden text-gray-500 font-medium mr-1">Qty:</span>
                      {quantity}
                    </div>
                    <div className="md:col-span-2 flex items-center md:justify-center text-gray-800 font-medium text-sm sm:text-base">
                      <span className="md:hidden text-gray-500 font-medium mr-1">Price:</span>
                      {formatPrice(price)}
                    </div>
                  </div>

                  {/* Status / Action */}
                  <div className="md:col-span-2 mt-1 md:mt-0">
                    {statusDisplay.type === 'track' ? (
                      <div className="space-y-2">
                        <p className="font-bold text-gray-900 uppercase text-[11px] sm:text-xs">{statusDisplay.statusLabel}</p>
                        <Link
                          to={getOrderTrackPath(oi.orderId, oi.itemId)}
                          className="block w-full bg-black text-white py-2 sm:py-2.5 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold uppercase hover:bg-gray-800 transition-colors text-center"
                        >
                          Track order
                        </Link>
                        <div className="text-left">
                          <p className="text-gray-700 text-[11px] sm:text-xs font-medium">Order #{oi.orderId ?? '—'}</p>
                          {oi.orderCreatedAt && (
                            <p className="text-gray-500 text-[10px] sm:text-[11px] mt-0.5">
                              Placed {formatOrderDateTime(oi.orderCreatedAt)}
                            </p>
                          )}
                          <p className="text-gray-500 text-[10px] sm:text-[11px] mt-0.5">
                            Payment: {getPaymentModeLabel(oi)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-left space-y-1.5">
                        <p className="text-gray-700 text-[11px] sm:text-xs font-medium">Order #{oi.orderId ?? '—'}</p>
                        {oi.orderCreatedAt && (
                          <p className="text-gray-500 text-[10px] sm:text-[11px]">Placed {formatOrderDateTime(oi.orderCreatedAt)}</p>
                        )}
                        <p className="text-gray-500 text-[10px] sm:text-[11px]">Payment: {getPaymentModeLabel(oi)}</p>
                        <p
                          className={`font-bold uppercase text-[11px] sm:text-xs px-2 py-1 rounded inline-block border ${
                            statusDisplay.type === 'cancelled'
                              ? 'border-red-500 text-red-600'
                              : statusDisplay.type === 'delivered'
                                ? 'border-green-500 text-green-700'
                                : statusDisplay.type === 'exchanged' || statusDisplay.type === 'exchange_process'
                                  ? 'border-blue-500 text-blue-700'
                                  : 'border-gray-300 text-gray-900'
                          }`}
                        >
                          {statusDisplay.statusLabel ?? statusDisplay.label}
                        </p>
                        {statusDisplay.dateStr && (
                          <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{statusDisplay.dateStr}</p>
                        )}
                        {(statusDisplay.type === 'delivered' || statusDisplay.type === 'exchanged' || statusDisplay.type === 'exchange_process' || statusDisplay.type === 'cancelled') && (
                          <Link
                            to={getOrderTrackPath(oi.orderId, oi.itemId)}
                            className="block w-full mt-1 py-2 px-3 border border-gray-300 text-[11px] sm:text-xs font-semibold uppercase hover:bg-gray-50 transition-colors text-center"
                          >
                            See more
                          </Link>
                        )}
                        {(statusDisplay.type !== 'delivered' && statusDisplay.type !== 'exchanged' && statusDisplay.type !== 'exchange_process' && statusDisplay.type !== 'cancelled') && (
                          <>
                            {statusDisplay.name && statusDisplay.name !== '—' && (
                              <p className="text-gray-600 text-[11px] sm:text-xs mt-1">{statusDisplay.name}</p>
                            )}
                            {statusDisplay.fullAddress && statusDisplay.fullAddress !== '—' && (
                              <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 break-words">{statusDisplay.fullAddress}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <Link to={ROUTES.HOME} className="text-xs sm:text-sm font-medium uppercase text-gray-700 hover:text-black hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrdersPage
