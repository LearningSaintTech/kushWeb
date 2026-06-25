import { useState, useEffect, useMemo } from 'react'
import { debugLog } from '../../utils/debugLog.js';
import { redactForLog } from '../../utils/logRedact.util.js';
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { orderService } from '../../services/order.service.js'
import { ROUTES, getOrderTrackPath, getProductPath } from '../../utils/constants'
import { formatPaymentLine } from '../../utils/paymentMode'
import { getOfferBadgeText } from '../../utils/bindOffer.js'
import { BindOfferLineNote } from '../../shared/components/BindOfferCartExtras.jsx'

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

/** Normalize API line status (e.g. Shiprocket "PICKED UP" → PICKED_UP) for comparisons */
function normalizeLineStatus(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
}

/** Line-item statuses where we still show "Track order" (in transit, not yet delivered). */
const TRACKABLE_LINE_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  // Shiprocket / courier granular states (often on `status` while order is in transit)
  'PICKED_UP',
  'IN_TRANSIT',
  'DISPATCHED',
  'MANIFESTED',
  'AWB_ASSIGNED',
  'BOOKED',
  'SHIPMENT_BOOKED',
  'PENDING_PICKUP',
  'PICKUP_SCHEDULED',
  'REACHED_DESTINATION_HUB',
  'OUT_FOR_PICKUP',
])

function isExchangeLineStatus(status) {
  return String(status || '').toUpperCase().startsWith('EXCHANGE_')
}

function isExchangeReplacementOrder(oi, replacementOrderIds = null) {
  if ((oi?.orderType || 'STANDARD') === 'EXCHANGE') return true
  if (oi?.exchangeMeta?.originalOrderId) return true
  const orderId = oi?.orderId ? String(oi.orderId).trim() : ''
  if (orderId && replacementOrderIds?.has(orderId)) return true
  const lineStatus = String(oi?.status ?? oi?.itemStatus ?? '').toUpperCase()
  const linePayable = Number(oi?.item?.finalPayable ?? oi?.item?.itemSubtotal ?? NaN)
  if (
    oi?.item?.exchangeId &&
    linePayable === 0 &&
    !lineStatus.startsWith('EXCHANGE_')
  ) {
    return true
  }
  return false
}

function ReplacementOrderPriceMark({ compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
      <span className="inline-block rounded border border-blue-500 bg-blue-50 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-blue-800">
        Replacement order
      </span>
      <span className="text-[10px] sm:text-xs text-gray-500 uppercase">No charge</span>
    </div>
  )
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
    debugLog('[OrdersPage]', 'mount / deps', {
      isAuthenticated,
      pathname: location.pathname,
      hasOrderState: Boolean(location.state?.orderId || location.state?.orderSuccess),
    })
  }, [isAuthenticated, location.pathname, location.state, orderSuccessFromState, orderIdFromState])

  useEffect(() => {
    if (!isAuthenticated) {
      debugLog('[OrdersPage]','fetch skipped: not authenticated')
      setLoading(false)
      return
    }
    const params = { page: 1, limit: 20 }
    debugLog('[OrdersPage]','getOrderItems request', params)
    orderService
      .getOrderItems(params)
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const items = data?.items ?? data ?? []
        const pag = data?.pagination ?? null
        const list = Array.isArray(items) ? items : []
        debugLog('[OrdersPage]', 'getOrderItems loaded', {
          count: list.length,
          pagination: pag,
          sample: redactForLog(list[0]),
        })
        setOrderItems(list)
        setPagination(pag)
      })
      .catch((err) => {
        debugLog('[OrdersPage]', 'getOrderItems error', {
          status: err?.response?.status,
          message: err?.response?.data?.message ?? err?.message,
        })
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load orders')
      })
      .finally(() => {
        debugLog('[OrdersPage]','getOrderItems finished (loading false)')
        setLoading(false)
      })
  }, [isAuthenticated])

  useEffect(() => {
    debugLog('[OrdersPage]','state snapshot', {
      loading,
      error,
      orderItemsLength: orderItems.length,
      pagination,
    })
  }, [loading, error, orderItems, pagination])

  /** Map backend status to displfay label (lifecycle order) */
  const getStatusLabel = (status) => {
    const s = normalizeLineStatus(status)
    const map = {
      CREATED: 'Order placed',
      CONFIRMED: 'Confirmed',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      OUT_FOR_DELIVERY: 'Out for delivery',
      PICKED_UP: 'Picked up',
      IN_TRANSIT: 'In transit',
      DISPATCHED: 'Dispatched',
      MANIFESTED: 'Manifested',
      AWB_ASSIGNED: 'AWB assigned',
      BOOKED: 'Booked',
      SHIPMENT_BOOKED: 'Shipment booked',
      PENDING_PICKUP: 'Pending pickup',
      PICKUP_SCHEDULED: 'Pickup scheduled',
      REACHED_DESTINATION_HUB: 'Reached hub',
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
      CANCELED: 'Cancelled',
    }
    return map[s] || (s ? s.replace(/_/g, ' ') : '—')
  }

  const getStatusDisplay = (oi, replacementOrderIds) => {
    if (isExchangeReplacementOrder(oi, replacementOrderIds)) {
      const status = normalizeLineStatus(oi.status ?? oi.itemStatus)
      const statusLabel = getStatusLabel(status)
      if (TRACKABLE_LINE_STATUSES.has(status)) {
        return { type: 'exchange_replacement', label: 'REPLACEMENT ORDER', statusLabel }
      }
      return { type: 'exchange_replacement', label: 'REPLACEMENT ORDER', statusLabel }
    }

    const status = normalizeLineStatus(oi.status ?? oi.itemStatus)
    const address = oi.address ?? {}
    const name = address?.name ?? '—'
    const fullAddress = address?.fullAddress ?? address?.addressLine ?? '—'
    const deliveredAt = oi.item?.deliveredAt ?? oi.latestStatusHistory?.createdAt ?? oi.orderCreatedAt
    const dateStr = formatStatusDate(deliveredAt || oi.orderCreatedAt)
    const statusLabel = getStatusLabel(status)

    if (TRACKABLE_LINE_STATUSES.has(status)) {
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
    if (status === 'CANCELLED' || status === 'CANCELED') {
      return { type: 'cancelled', label: 'CANCELLED', statusLabel, dateStr, name, fullAddress }
    }
    return { type: 'other', label: statusLabel, statusLabel, dateStr, name, fullAddress }
  }

  /** Order IDs referenced as exchange replacements by other lines in this list */
  const replacementOrderIds = useMemo(() => {
    const ids = new Set()
    for (const oi of orderItems) {
      const rid = oi?.item?.exchangeReplacementOrderId
      if (rid) ids.add(String(rid).trim())
    }
    return ids
  }, [orderItems])

  /** Latest orders first */
  const sortedOrderItems = useMemo(
    () =>
      [...orderItems].sort((a, b) => {
        const dateA = a.orderCreatedAt ? new Date(a.orderCreatedAt).getTime() : 0
        const dateB = b.orderCreatedAt ? new Date(b.orderCreatedAt).getTime() : 0
        return dateB - dateA
      }),
    [orderItems]
  )

  useEffect(() => {
    if (!import.meta.env.DEV || !sortedOrderItems.length) return
    const table = sortedOrderItems.map((oi, idx) => {
      const item = oi.item ?? {}
      const sd = getStatusDisplay(oi, replacementOrderIds)
      return {
        idx,
        orderId: oi.orderId,
        itemId: oi.itemId,
        productItemId: oi.productItemId,
        rawStatus: oi.status ?? oi.itemStatus,
        statusDisplay: sd,
        trackPath: getOrderTrackPath(oi.orderId, oi.itemId),
        name: item?.name,
        quantity: item?.quantity,
        imageUrl: item?.variant?.imageUrl,
        priceFields: {
          finalPayable: item?.finalPayable,
          itemSubtotal: item?.itemSubtotal,
          unitPrice: item?.unitPrice,
        },
      }
    })
    debugLog('[OrdersPage]','sorted rows (full debug table)', table)
  }, [sortedOrderItems, replacementOrderIds])

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
    <div className="min-h-screen bg-white text-black pt-30 pb-12 font-sans">
      <div className=" px-4 sm:px-6 md:px-8 ">
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-gray-800 mb-6 sm:mb-8">My orders</h1>

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
              const shortDesc = item?.shortDescription ?? ''
              const brand = item?.brand ?? item?.productId ?? '—'
              const color = item?.variant?.color ?? ''
              const imageUrl = item?.variant?.imageUrl ?? ''
              const productId =
                oi.itemId ??
                oi.productItemId ??
                item?._id ??
                item?.id
              const productPath = productId ? getProductPath(productId, name, shortDesc) : null
              const quantity = item?.quantity ?? 1
              const price = item?.finalPayable ?? item?.itemSubtotal ?? (item?.unitPrice ?? 0) * quantity
              const trackingId = oi.latestStatusHistory?.trackingId ?? null
              const statusDisplay = getStatusDisplay(oi, replacementOrderIds)
              const orderId = oi.orderId ?? ''
              const itemId = oi.itemId?.toString?.() ?? oi.productItemId?.toString?.() ?? ''
              const rowKey = orderId && itemId ? `${orderId}-${itemId}-${idx}` : `row-${idx}`
              const exchangeMeta = oi.exchangeMeta || null
              const isExchangeReplacement = isExchangeReplacementOrder(oi, replacementOrderIds)
              const exchangeReplacementOrderId = item?.exchangeReplacementOrderId || null
              const isOriginalInExchange = isExchangeLineStatus(oi.status ?? oi.itemStatus)

              return (
                <div
                  key={rowKey}
                  className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 border-b border-gray-200 py-4 md:py-5 px-4 last:border-b-0"
                >
                  {/* Product */}
                  <div className="flex gap-3 sm:gap-4 min-w-0 md:col-span-6">
                    <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-2">
                      {productPath ? (
                        <Link to={productPath} className="block w-full h-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={name}
                              loading="eager"
                              decoding="async"
                              className="max-h-full max-w-full object-contain object-center"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                          )}
                        </Link>
                      ) : imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={name}
                          loading="eager"
                          decoding="async"
                          className="max-h-full max-w-full object-contain object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* <p className="font-bold text-gray-900 uppercase text-xs sm:text-sm truncate">{brand}</p> */}
                      {productPath ? (
                        <Link to={productPath} className="block cursor-pointer hover:underline">
                          <p className="text-gray-700 text-xs sm:text-sm mt-0.5 normal-case line-clamp-2">{name}{color ? ` ${color}` : ''}</p>
                        </Link>
                      ) : (
                        <p className="text-gray-700 text-xs sm:text-sm mt-0.5 normal-case line-clamp-2">{name}{color ? ` ${color}` : ''}</p>
                      )}
                      {isOriginalInExchange ? (
                        <p className="text-[10px] sm:text-xs font-semibold uppercase text-blue-700 mt-1">
                          Exchange in progress
                        </p>
                      ) : null}
                      {exchangeReplacementOrderId ? (
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                          Replacement order: #{exchangeReplacementOrderId}
                        </p>
                      ) : null}
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
                    <div className="md:col-span-2 flex flex-col items-start md:items-center justify-center text-gray-800 font-medium text-sm sm:text-base">
                      <span className="md:hidden text-gray-500 font-medium mr-1 mb-1">Price:</span>
                      {isExchangeReplacement ? (
                        <ReplacementOrderPriceMark />
                      ) : (
                        <>
                          {formatPrice(price)}
                          {getOfferBadgeText(item?.bindOffer) ? (
                            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                              {getOfferBadgeText(item.bindOffer)}
                            </span>
                          ) : null}
                          <BindOfferLineNote
                            bindOffer={item?.bindOffer}
                            className="normal-case tracking-normal"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status / Action */}
                  <div className="md:col-span-2 mt-1 md:mt-0">
                    {statusDisplay.type === 'track' || statusDisplay.type === 'exchange_replacement' ? (
                      <div className="space-y-2">
                        {statusDisplay.type === 'exchange_replacement' ? (
                          <p className="font-bold text-blue-800 uppercase text-[11px] sm:text-xs">
                            {statusDisplay.label}
                          </p>
                        ) : (
                          <p className="font-bold text-gray-900 uppercase text-[11px] sm:text-xs">{statusDisplay.statusLabel}</p>
                        )}
                        <Link
                          to={getOrderTrackPath(oi.orderId, oi.itemId)}
                          className="block w-full bg-black text-white py-2 sm:py-2.5 px-3 sm:px-4 text-[11px] sm:text-xs font-semibold uppercase hover:bg-gray-800 transition-colors text-center"
                        >
                          {statusDisplay.type === 'exchange_replacement' ? 'Track replaced order' : 'Track order'}
                        </Link>
                        <div className="text-left">
                          <p className="text-gray-700 text-[11px] sm:text-xs font-medium">Order #{oi.orderId ?? '—'}</p>
                          {isExchangeReplacement && exchangeMeta?.originalOrderId ? (
                            <Link
                              to={getOrderTrackPath(exchangeMeta.originalOrderId, exchangeMeta.originalItemId)}
                              className="block text-[10px] sm:text-[11px] font-semibold uppercase text-blue-700 hover:underline mt-0.5"
                            >
                              View original order
                            </Link>
                          ) : null}
                          {oi.orderCreatedAt && (
                            <p className="text-gray-500 text-[10px] sm:text-[11px] mt-0.5">
                              Placed {formatOrderDateTime(oi.orderCreatedAt)}
                            </p>
                          )}
                          {!isExchangeReplacement ? (
                            <p className="text-gray-500 text-[10px] sm:text-[11px] mt-0.5">
                              Payment: {formatPaymentLine(oi)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="text-left space-y-1.5">
                        <p className="text-gray-700 text-[11px] sm:text-xs font-medium">Order #{oi.orderId ?? '—'}</p>
                        {isExchangeReplacement && exchangeMeta?.originalOrderId ? (
                          <Link
                            to={getOrderTrackPath(exchangeMeta.originalOrderId, exchangeMeta.originalItemId)}
                            className="block text-[10px] sm:text-[11px] font-semibold uppercase text-blue-700 hover:underline mt-0.5"
                          >
                            View original order
                          </Link>
                        ) : null}
                        {oi.orderCreatedAt && (
                          <p className="text-gray-500 text-[10px] sm:text-[11px]">Placed {formatOrderDateTime(oi.orderCreatedAt)}</p>
                        )}
                        {!isExchangeReplacement ? (
                          <p className="text-gray-500 text-[10px] sm:text-[11px]">Payment: {formatPaymentLine(oi)}</p>
                        ) : null}
                        <p
                          className={`font-bold uppercase text-[11px] sm:text-xs px-2 py-1 rounded inline-block border ${
                            isExchangeReplacement
                              ? 'border-blue-500 text-blue-800 bg-blue-50'
                              : statusDisplay.type === 'cancelled'
                              ? 'border-red-500 text-red-600'
                              : statusDisplay.type === 'delivered'
                                ? 'border-green-500 text-green-700'
                                : statusDisplay.type === 'exchanged' || statusDisplay.type === 'exchange_process'
                                  ? 'border-blue-500 text-blue-700'
                                  : 'border-gray-300 text-gray-900'
                            }`}
                        >
                          {isExchangeReplacement ? 'Replacement order' : (statusDisplay.statusLabel ?? statusDisplay.label)}
                        </p>
                        {statusDisplay.dateStr && (
                          <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{statusDisplay.dateStr}</p>
                        )}
                        {(statusDisplay.type === 'delivered' || statusDisplay.type === 'exchanged' || statusDisplay.type === 'exchange_process' || statusDisplay.type === 'cancelled' || isExchangeReplacement) && (
                          <Link
                            to={getOrderTrackPath(oi.orderId, oi.itemId)}
                            className="block w-full mt-1 py-2 px-3 border border-gray-300 text-[11px] sm:text-xs font-semibold uppercase hover:bg-gray-50 transition-colors text-center"
                          >
                            {isExchangeReplacement ? 'Track replaced order' : 'See more'}
                          </Link>
                        )}
                        {(statusDisplay.type !== 'delivered' && statusDisplay.type !== 'exchanged' && statusDisplay.type !== 'exchange_process' && statusDisplay.type !== 'cancelled') && (
                          <>
                            {statusDisplay.name && statusDisplay.name !== '—' && (
                              <p className="text-gray-600 text-[11px] sm:text-xs mt-1">{statusDisplay.name}</p>
                            )}
                            {statusDisplay.fullAddress && statusDisplay.fullAddress !== '—' && (
                              <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 wrap-break-word">{statusDisplay.fullAddress}</p>
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
