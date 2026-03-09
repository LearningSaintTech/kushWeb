import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { orderService } from '../../services/order.service.js'
import { itemsService } from '../../services/items.service.js'
import { cancellationService } from '../../services/cancellation.service.js'
import { exchangeService } from '../../services/exchange.service.js'
import { ROUTES } from '../../utils/constants'

const EXCHANGE_QUANTITY_OPTIONS = [
  { value: 1, label: 'ONE' },
  { value: 2, label: 'TWO' },
  { value: 3, label: 'THREE' },
  { value: 4, label: 'FOUR' },
  { value: 5, label: 'FIVE' },
]

const CANCEL_REASONS = [
  'Changed my mind',
  'Wrong size or color',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery too late',
  'Other',
]

// Delivery lifecycle from ORDER_STATUS_ENUM (order.model.js) — used for progress bar
const DELIVERY_STATUS_ORDER = [
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
]

const STEPPER = [
  { key: 'order_placed', label: 'Order Placed', statuses: ['CREATED'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['CONFIRMED', 'PROCESSING'] },
  { key: 'shipped', label: 'Shipped', statuses: ['SHIPPED'] },
  { key: 'out_for_delivery', label: 'Out for Delivery', statuses: ['OUT_FOR_DELIVERY'] },
  { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED'] },
]

const EXCHANGE_STATUSES = [
  'EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'EXCHANGE_REJECTED', 'EXCHANGE_PICKUP_SCHEDULED',
  'EXCHANGE_PICKED', 'EXCHANGE_RECEIVED', 'EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED',
  'EXCHANGE_DELIVERED', 'EXCHANGE_COMPLETED'
]

// One step per exchange status (matches order.model.js ORDER_STATUS_ENUM); EXCHANGE_REJECTED shown separately
const EXCHANGE_STEPPER = [
  { key: 'EXCHANGE_REQUESTED', label: 'Exchange Requested', statuses: ['EXCHANGE_REQUESTED'] },
  { key: 'EXCHANGE_APPROVED', label: 'Exchange Approved', statuses: ['EXCHANGE_APPROVED'] },
  { key: 'EXCHANGE_PICKUP_SCHEDULED', label: 'Exchange Pickup Scheduled', statuses: ['EXCHANGE_PICKUP_SCHEDULED'] },
  { key: 'EXCHANGE_PICKED', label: 'Exchange Picked', statuses: ['EXCHANGE_PICKED'] },
  { key: 'EXCHANGE_RECEIVED', label: 'Exchange Received', statuses: ['EXCHANGE_RECEIVED'] },
  { key: 'EXCHANGE_PROCESSING', label: 'Exchange Processing', statuses: ['EXCHANGE_PROCESSING'] },
  { key: 'EXCHANGE_SHIPPED', label: 'Exchange Shipped', statuses: ['EXCHANGE_SHIPPED'] },
  { key: 'EXCHANGE_DELIVERED', label: 'Exchange Delivered', statuses: ['EXCHANGE_DELIVERED'] },
  { key: 'EXCHANGE_COMPLETED', label: 'Exchange Completed', statuses: ['EXCHANGE_COMPLETED'] },
]

const IN_PROGRESS_EXCHANGE_STATUSES = [
  'exchangeRequested', 'exchangeApproved', 'pickupScheduled', 'pickedUp', 'inTransit',
  'receivedAtWarehouse', 'qualityCheck', 'exchangeShipped', 'outForDelivery', 'exchangeDelivered'
]

function formatStepperDate(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `On ${day}/${month}/${year}`
}

function getStepStatus(statusHistory, currentStatus, step) {
  const statusUpper = (currentStatus || '').toUpperCase()
  const stepIndex = STEPPER.findIndex(s => s.key === step.key)
  const completedStatuses = STEPPER.slice(0, stepIndex + 1).flatMap(s => s.statuses)
  const isCompleted = completedStatuses.some(s => statusUpper === s)
  const record = (statusHistory || []).find(r => step.statuses.includes((r.status || '').toUpperCase()))
  return {
    completed: isCompleted,
    date: record?.createdAt ? formatStepperDate(record.createdAt) : (isCompleted ? formatStepperDate(new Date()) : ''),
  }
}

/** Current step index (0–4) for progress bar; maps ORDER_STATUS_ENUM to stepper step */
function getCurrentStepIndex(currentStatus) {
  const statusUpper = (currentStatus || '').toUpperCase()
  for (let i = STEPPER.length - 1; i >= 0; i--) {
    if (STEPPER[i].statuses.includes(statusUpper)) return i
  }
  return 0
}

function getExchangeStepStatus(statusHistory, currentStatus, step) {
  const statusUpper = (currentStatus || '').toUpperCase()
  const stepIndex = EXCHANGE_STEPPER.findIndex(s => s.key === step.key)
  const completedStatuses = EXCHANGE_STEPPER.slice(0, stepIndex + 1).flatMap(s => s.statuses)
  const isCompleted = completedStatuses.some(s => statusUpper === s)
  const record = (statusHistory || []).find(r => step.statuses.includes((r.status || '').toUpperCase()))
  return {
    completed: isCompleted,
    date: record?.createdAt ? formatStepperDate(record.createdAt) : (isCompleted ? formatStepperDate(new Date()) : ''),
  }
}

function getCurrentExchangeStepIndex(currentStatus) {
  const statusUpper = (currentStatus || '').toUpperCase()
  for (let i = EXCHANGE_STEPPER.length - 1; i >= 0; i--) {
    if (EXCHANGE_STEPPER[i].statuses.includes(statusUpper)) return i
  }
  return 0
}

function isDeliveryStepperRelevant(currentStatus) {
  const statusUpper = (currentStatus || '').toUpperCase()
  if (statusUpper === 'CANCELLED') return false
  if (EXCHANGE_STATUSES.includes(statusUpper)) return false
  return true
}

function isExchangeInProgress(exchange) {
  if (!exchange?.hasExchange || !exchange?.latestExchange?.status) return false
  const s = (exchange.latestExchange.status || '').toLowerCase().replace(/_/g, '')
  const inProgress = IN_PROGRESS_EXCHANGE_STATUSES.map((x) => x.toLowerCase().replace(/_/g, ''))
  return inProgress.some((x) => s.includes(x) || x.includes(s))
}

export default function TrackOrderPage() {
  const { orderId, itemId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [cancelStep, setCancelStep] = useState(0)
  const [selectedCancelItemId, setSelectedCancelItemId] = useState(null)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [policyAccepted, setPolicyAccepted] = useState(false)

  const [exchangeStep, setExchangeStep] = useState(0)
  const [exchangeQuantity, setExchangeQuantity] = useState(1)
  const [selectedExchangeItemId, setSelectedExchangeItemId] = useState(null)
  const [exchangeDesiredSize, setExchangeDesiredSize] = useState('')
  const [exchangeDesiredColor, setExchangeDesiredColor] = useState('')
  const [exchangeItemDetails, setExchangeItemDetails] = useState(null)
  const [exchangeItemLoading, setExchangeItemLoading] = useState(false)
  const [exchangeImages, setExchangeImages] = useState([])
  const [exchangeSubmitting, setExchangeSubmitting] = useState(false)
  const [exchangeError, setExchangeError] = useState(null)

  const userName = user?.name || user?.firstName || 'Customer'

  useEffect(() => {
    if (!isAuthenticated || !orderId || !itemId) {
      setLoading(false)
      return
    }
    console.log('[TrackOrder] REQ getOrderItemById', { orderId, itemId })
    orderService
      .getOrderItemById(orderId, itemId)
      .then((res) => {
        console.log('[TrackOrder] RES getOrderItemById', res?.data)
        const payload = res?.data?.data ?? res?.data
        setData(payload)
        setSelectedCancelItemId(payload?.itemId ?? null)
      })
      .catch((err) => {
        console.log('[TrackOrder] ERR getOrderItemById', err?.response?.data ?? err?.message)
        setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load order details')
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, orderId, itemId])

  useEffect(() => {
    if (exchangeStep !== 3 || !selectedExchangeItemId) {
      if (exchangeStep !== 3) setExchangeItemDetails(null)
      return
    }
    setExchangeItemLoading(true)
    setExchangeItemDetails(null)
    setExchangeDesiredSize('')
    setExchangeDesiredColor('')
    const id = typeof selectedExchangeItemId === 'string' ? selectedExchangeItemId : selectedExchangeItemId?.toString?.()
    itemsService
      .getById(id)
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const item = data?.item ?? data
        setExchangeItemDetails(item || null)
        if (item?.variants?.length) {
          const first = item.variants[0]
          setExchangeDesiredColor(first.color?.name ?? '')
          if (first.sizes?.length) setExchangeDesiredSize(first.sizes[0].size ?? '')
        }
      })
      .catch(() => setExchangeItemDetails(null))
      .finally(() => setExchangeItemLoading(false))
  }, [exchangeStep, selectedExchangeItemId])

  const openCancelModal = () => {
    setCancelError(null)
    setPolicyAccepted(false)
    setCancelStep(1)
    setSelectedCancelItemId(data?.itemId ?? null)
    setCancelReason(CANCEL_REASONS[0])
  }

  const closeCancelModal = () => {
    setCancelStep(0)
    setCancelError(null)
    if (cancelStep === 3) {
      orderService.getOrderItemById(orderId, itemId).then((res) => {
        const payload = res?.data?.data ?? res?.data
        setData(payload)
      }).catch(() => {})
    }
  }

  const cancelModalContinue = () => {
    if (cancelStep === 1) {
      setPolicyAccepted(false)
      setCancelStep(2)
      return
    }
    if (cancelStep === 2) {
      setCancelError(null)
      setCancelSubmitting(true)
      cancellationService
        .cancelOrderItem({
          orderId,
          itemId: selectedCancelItemId,
          reason: cancelReason,
          couponIssued: true,
        })
        .then(() => {
          setCancelStep(3)
        })
        .catch((err) => {
          setCancelError(err?.response?.data?.message ?? err?.message ?? 'Failed to cancel item')
        })
        .finally(() => setCancelSubmitting(false))
    }
  }

  const openExchangeModal = () => {
    setExchangeError(null)
    setExchangeStep(1)
    setExchangeQuantity(1)
    setSelectedExchangeItemId(data?.itemId ?? null)
    setExchangeDesiredSize('')
    setExchangeDesiredColor('')
    setExchangeImages([])
  }

  const closeExchangeModal = () => {
    const wasSuccess = exchangeStep === 5
    setExchangeStep(0)
    setExchangeError(null)
    if (wasSuccess) {
      orderService.getOrderItemById(orderId, itemId).then((res) => {
        const payload = res?.data?.data ?? res?.data
        setData(payload)
      }).catch(() => {})
    }
  }

  const exchangeModalContinue = () => {
    if (exchangeStep === 1) {
      setExchangeStep(2)
      return
    }
    if (exchangeStep === 2) {
      setExchangeStep(3)
      return
    }
    if (exchangeStep === 3) {
      if (!exchangeDesiredColor.trim() || !exchangeDesiredSize.trim()) {
        setExchangeError('Please select size and color.')
        return
      }
      setExchangeError(null)
      setExchangeStep(4)
      return
    }
    if (exchangeStep === 4) {
      if (exchangeImages.length < 3) {
        setExchangeError('Please upload at least 3 images.')
        return
      }
      if (exchangeImages.length > 5) {
        setExchangeError('Maximum 5 images allowed.')
        return
      }
      setExchangeError(null)
      setExchangeSubmitting(true)
      const selectedEntry = bookedItems.find((e) => e.itemId?.toString() === selectedExchangeItemId?.toString())
      const reasonText = selectedEntry
        ? [selectedEntry.item?.name, selectedEntry.item?.shortDescription].filter(Boolean).join(' ') || 'Exchange requested'
        : 'Exchange requested'
      exchangeService
        .createExchangeRequest(
          {
            orderId,
            itemId: selectedExchangeItemId,
            quantityToExchange: exchangeQuantity,
            reason: reasonText,
            desiredSize: exchangeDesiredSize.trim() || undefined,
            desiredColor: exchangeDesiredColor.trim() || undefined,
          },
          exchangeImages
        )
        .then(() => {
          setExchangeStep(5)
        })
        .catch((err) => {
          setExchangeError(err?.response?.data?.message ?? err?.message ?? 'Failed to create exchange request')
        })
        .finally(() => setExchangeSubmitting(false))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Please sign in to track your order.</p>
          <Link to={ROUTES.AUTH} className="mt-4 inline-block text-black font-semibold uppercase hover:underline">Sign in</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading order details…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-red-600">{error || 'Order not found.'}</p>
          <Link to={ROUTES.ORDERS} className="mt-4 inline-block text-black font-semibold uppercase hover:underline">Back to orders</Link>
        </div>
      </div>
    )
  }

  const item = data.item || {}
  const brand = item.brandName || item.brand || '—'
  const name = item.name || item.shortDescription || '—'
  const imageUrl = item.variant?.imageUrl ?? ''
  const trackingId = data.shipment?.trackingId || data.trackingId || '—'
  const orderNo = data.orderId || '—'
  const currentStatus = (data.status || '').toUpperCase()
  const statusHistory = data.statusHistory || []
  const otherItems = data.otherItemsInOrder || []
  const bookedItems = [{ item, itemId: data.itemId }].concat(
    otherItems.map((o) => ({
      item: { ...(o.item || {}), name: o.name, shortDescription: o.shortDescription },
      itemId: o.itemId,
    }))
  )
  const isCancellable = data.isCancellable === true
  const isExchangeable = data.isExchangeable !== false
  const exchangeInProgress = isExchangeInProgress(data.exchange)
  const showExchangeButton = isExchangeable && !exchangeInProgress && currentStatus === 'DELIVERED'
  const showDeliveryStepper = isDeliveryStepperRelevant(currentStatus)
  const showExchangeStepper =
    currentStatus !== 'CANCELLED' &&
    EXCHANGE_STATUSES.includes(currentStatus) &&
    currentStatus !== 'EXCHANGE_REJECTED'

  // Delivery boy from API (returned for SHIPPED / OUT_FOR_DELIVERY) or fallback to shipment
  const deliveryBoyName = data.deliveryBoy?.name ?? data.shipment?.deliveryAgentName ?? null
  const deliveryBoyPhone = data.deliveryBoy?.phoneNumber ?? data.shipment?.deliveryAgentPhone ?? null
  const showDeliveryBoyContact = (deliveryBoyName || deliveryBoyPhone) && ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(currentStatus)

  return (
    <div className="min-h-screen mt-20 bg-gray-100 pt-24 pb-12">
      <div className=" px-4 ">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-black uppercase">HI {String(userName).toUpperCase()},</h1>
          <p className="text-gray-700 mt-1">Here The Latest Update On Your Order!</p>
        </div>

        {/* Order item summary card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-40 h-40 shrink-0 overflow-hidden bg-gray-100 rounded">
              {imageUrl ? (
                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-black uppercase">{brand}</p>
              <p className="text-gray-800 mt-1 normal-case">{name}</p>
              <p className="text-gray-600 text-sm mt-2">
                Tracking ID : <strong>#{trackingId}</strong>
              </p>
              <p className="text-gray-600 text-sm mt-0.5">
                Order No : <strong>{orderNo}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Order status card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-black uppercase text-sm mb-1">ORDER STATUS</h2>
          <p className="text-gray-600 text-sm mb-6">ORDER #{orderNo}</p>

          {/* Status: Cancelled */}
          {currentStatus === 'CANCELLED' && (
            <div className="py-4 mb-6 rounded border border-red-200 bg-red-50">
              <p className="text-red-700 font-semibold uppercase text-sm">Order item cancelled</p>
              <p className="text-gray-600 text-sm mt-1">This item has been cancelled.</p>
            </div>
          )}

          {/* Status: Exchange rejected */}
          {currentStatus === 'EXCHANGE_REJECTED' && (
            <div className="py-4 mb-6 rounded border border-amber-200 bg-amber-50">
              <p className="text-amber-800 font-semibold uppercase text-sm">Exchange</p>
              <p className="text-gray-700 text-sm mt-1">Your exchange request was rejected.</p>
            </div>
          )}

          {/* Exchange flow progress bar (same style as delivery) */}
          {showExchangeStepper && (() => {
            const currentStepIndex = getCurrentExchangeStepIndex(currentStatus)
            const progressPercent = EXCHANGE_STEPPER.length > 0 ? ((currentStepIndex + 1) / EXCHANGE_STEPPER.length) * 100 : 0
            return (
              <div className="mb-8 overflow-x-auto md:overflow-visible -mx-1 px-1">
                <div className="relative min-w-[720px] md:min-w-0">
                  <div className="absolute left-0 right-0 top-[10px] h-2 w-full rounded-full bg-gray-200 -translate-y-1/2" />
                  <div
                    className="absolute left-0 top-[10px] h-2 rounded-full bg-black -translate-y-1/2 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div className="flex flex-nowrap justify-between gap-0 relative z-10">
                    {EXCHANGE_STEPPER.map((step, idx) => {
                      const reached = currentStepIndex >= idx
                      const { date } = getExchangeStepStatus(statusHistory, currentStatus, step)
                      return (
                        <div key={step.key} className="flex flex-col items-center shrink-0 w-20 md:w-auto md:min-w-0 md:flex-1 px-0.5">
                          <div
                            className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${
                              reached ? 'bg-black border-black' : 'bg-gray-300 border-gray-400'
                            }`}
                          >
                            {reached && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          <p className={`text-xs font-medium text-center mt-1.5 ${reached ? 'text-black' : 'text-gray-500'}`}>
                            {step.label}
                          </p>
                          {date && reached && (
                            <p className="text-[10px] text-gray-500 mt-0.5 text-center">{date}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* E-commerce style progress bar: each status name directly under its circle */}
          {showDeliveryStepper && (() => {
            const currentStepIndex = getCurrentStepIndex(currentStatus)
            const progressPercent = STEPPER.length > 0 ? ((currentStepIndex + 1) / STEPPER.length) * 100 : 0
            return (
              <div className="mb-8 relative">
                {/* Track + fill bar (positioned behind circles) */}
                <div className="absolute left-0 right-0 top-[10px] h-2 w-full rounded-full bg-gray-200 -translate-y-1/2" />
                <div
                  className="absolute left-0 top-[10px] h-2 rounded-full bg-black -translate-y-1/2 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* One column per step: circle then label under it so they align */}
                <div className="flex justify-between relative z-10">
                  {STEPPER.map((step, idx) => {
                    const reached = currentStepIndex >= idx
                    const { date } = getStepStatus(statusHistory, currentStatus, step)
                    return (
                      <div key={step.key} className="flex flex-col items-center min-w-0 flex-1 px-0.5">
                        <div
                          className={`w-5 h-5 rounded-full shrink-0 border-2 flex items-center justify-center ${
                            reached ? 'bg-black border-black' : 'bg-gray-300 border-gray-400'
                          }`}
                        >
                          {reached && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <p className={`text-xs font-medium text-center mt-1.5 ${reached ? 'text-black' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        {date && reached && (
                          <p className="text-[10px] text-gray-500 mt-0.5 text-center">{date}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Contact delivery boy (only for SHIPPED / OUT_FOR_DELIVERY when API returns deliveryBoy) + Cancel + Exchange */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
            {showDeliveryBoyContact ? (
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">Contact Delivery Boy</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                    {(deliveryBoyName || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{deliveryBoyName || 'Delivery partner'}</p>
                    <p className="text-gray-600 text-sm">{deliveryBoyPhone || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              {isCancellable && (
                <button
                  type="button"
                  onClick={openCancelModal}
                  className="bg-black text-white px-6 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Cancel order
                </button>
              )}
              {showExchangeButton && (
                <button
                  type="button"
                  onClick={openExchangeModal}
                  className="bg-black text-white px-6 py-2.5 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Exchange
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Booked items card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="font-bold text-black uppercase text-sm mb-4">BOOKED ITEMS</h2>
          <ul className="space-y-4">
            {bookedItems.map((entry, idx) => {
              const it = entry.item || {}
              const img = it.variant?.imageUrl ?? ''
              const b = it.brandName || it.brand || '—'
              const n = it.name || it.shortDescription || '—'
              return (
                <li key={entry.itemId?.toString() || idx} className="flex gap-4 items-center">
                  <div className="w-16 h-16 shrink-0 overflow-hidden bg-gray-100 rounded">
                    {img ? (
                      <img src={img} alt={n} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 uppercase text-sm">{b}</p>
                    <p className="text-gray-700 text-sm normal-case">{n}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-8">
          <Link to={ROUTES.ORDERS} className="text-sm font-medium uppercase text-gray-700 hover:text-black hover:underline">
            ← Back to orders
          </Link>
        </div>

        {/* Cancel flow: 3 modals */}
        {cancelStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && closeCancelModal()}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {cancelStep === 1 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">Reason</h3>
                    <button type="button" className="p-1 text-gray-500 hover:text-black" aria-label="Close" onClick={closeCancelModal}>✕</button>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-black uppercase text-sm mb-3">Reason for cancel</p>
                    <p className="text-xs text-gray-600 mb-3">Select the item you want to cancel:</p>
                    <ul className="space-y-2 mb-4">
                      {bookedItems.map((entry, idx) => {
                        const it = entry.item || {}
                        const label = [it.brandName || it.brand, it.name || it.shortDescription].filter(Boolean).join(' ') || 'Item'
                        const idVal = entry.itemId?.toString?.() ?? idx
                        const isSelected = selectedCancelItemId?.toString?.() === idVal
                        return (
                          <li key={idVal}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="cancelItem"
                                checked={isSelected}
                                onChange={() => setSelectedCancelItemId(entry.itemId)}
                                className="w-4 h-4 border-gray-300 text-black"
                              />
                              <span className="text-sm uppercase text-gray-800">{label}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="text-xs text-gray-600 mb-2 mt-4">Reason for cancellation:</p>
                    <ul className="space-y-2">
                      {CANCEL_REASONS.map((r) => {
                        const isSelected = cancelReason === r
                        return (
                          <li key={r}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="cancelReason"
                                checked={isSelected}
                                onChange={() => setCancelReason(r)}
                                className="w-4 h-4 border-gray-300 text-black"
                              />
                              <span className="text-sm uppercase text-gray-800">{r}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button type="button" onClick={cancelModalContinue} className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors">
                      Continue
                    </button>
                  </div>
                </>
              )}
              {cancelStep === 2 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-black">
                    <h3 className="font-bold text-black uppercase">Policies</h3>
                    <button type="button" className="p-1 text-gray-500 hover:text-black text-lg" aria-label="Close" onClick={closeCancelModal}>✕</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="font-bold text-black uppercase text-xs mb-1">Order cancellation</p>
                      <p className="text-sm text-gray-700">If You Choose To Cancel Your Order After It Has Been Booked, The Order Will Be Successfully Cancelled As Per Our Cancellation Policy.</p>
                    </div>
                    <div>
                      <p className="font-bold text-black uppercase text-xs mb-1">Refund method</p>
                      <p className="text-sm text-gray-700">Instead Of A Cash Or Bank Refund, The Deducted Amount Will Be Credited As A Coupon To Your Account.</p>
                    </div>
                    <div>
                      <p className="font-bold text-black uppercase text-xs mb-1">Coupon details</p>
                      <label className="flex items-center gap-3 cursor-pointer mt-1">
                        <input
                          type="radio"
                          name="couponDetails"
                          checked
                          readOnly
                          className="w-4 h-4 border-gray-300 text-black"
                        />
                        <span className="text-sm text-gray-800 uppercase">The Coupon Value Will Be Equal To The Amount Deducted</span>
                      </label>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="w-4 h-4 mt-0.5 border-gray-300 text-black shrink-0"
                      />
                      <span className="text-sm text-gray-700">I accept the terms and conditions of the cancellation and refund policy.</span>
                    </label>
                  </div>
                  {cancelError && <p className="px-4 text-red-600 text-sm">{cancelError}</p>}
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={cancelModalContinue}
                      disabled={cancelSubmitting || !policyAccepted}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {cancelSubmitting ? 'Cancelling…' : 'Continue'}
                    </button>
                  </div>
                </>
              )}
              {cancelStep === 3 && (
                <>
                  <div className="flex justify-end p-4">
                    <button type="button" className="p-1 text-gray-500 hover:text-black" aria-label="Close" onClick={closeCancelModal}>✕</button>
                  </div>
                  <div className="px-4 pb-6 pt-0 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4 relative">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="font-bold text-black uppercase text-lg mb-2">Order cancelled successfully</h3>
                    <p className="text-sm text-gray-600">The refund coupon will be added to your Coupons section within 24 hours.</p>
                    <Link to={ROUTES.COUPONS} className="mt-4 inline-block text-sm font-semibold uppercase text-black hover:underline">View coupons</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exchange flow: 3 modals */}
        {exchangeStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && closeExchangeModal()}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {exchangeStep === 1 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase text-sm">Select the quantity to be exchanged</h3>
                    <button type="button" className="p-1 text-gray-500 hover:text-black text-lg" aria-label="Close" onClick={closeExchangeModal}>✕</button>
                  </div>
                  <div className="p-4">
                    <div className="relative">
                      <select
                        value={exchangeQuantity}
                        onChange={(e) => setExchangeQuantity(Number(e.target.value))}
                        className="w-full appearance-none bg-gray-100 border-0 rounded-lg px-4 py-3 pr-10 text-sm font-semibold uppercase text-gray-800"
                      >
                        {EXCHANGE_QUANTITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</span>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button type="button" onClick={exchangeModalContinue} className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors">
                      Exchange order
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 2 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-bold text-black uppercase">Reason</h3>
                      <p className="font-semibold text-black uppercase text-xs mt-0.5">Reason for exchange</p>
                    </div>
                    <button type="button" className="p-1 text-gray-500 hover:text-black text-lg" aria-label="Close" onClick={closeExchangeModal}>✕</button>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {bookedItems.map((entry, idx) => {
                        const it = entry.item || {}
                        const label = [it.brandName || it.brand, it.name || it.shortDescription].filter(Boolean).join(' ') || 'Item'
                        const idVal = entry.itemId?.toString?.() ?? idx
                        const isSelected = selectedExchangeItemId?.toString?.() === idVal
                        return (
                          <li key={idVal}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="exchangeItem"
                                checked={isSelected}
                                onChange={() => setSelectedExchangeItemId(entry.itemId)}
                                className="w-4 h-4 border-gray-300 text-black"
                              />
                              <span className="text-sm uppercase text-gray-800">{label}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <button type="button" onClick={exchangeModalContinue} className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors">
                      Continue
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 3 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">Desired size & color</h3>
                    <button type="button" className="p-1 text-gray-500 hover:text-black text-lg" aria-label="Close" onClick={closeExchangeModal}>✕</button>
                  </div>
                  <div className="p-4">
                    {exchangeItemLoading ? (
                      <p className="text-sm text-gray-500">Loading options…</p>
                    ) : !exchangeItemDetails?.variants?.length ? (
                      <p className="text-sm text-gray-500">No size/color options for this item.</p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-black uppercase mb-2">Select color</p>
                        <div className="flex flex-wrap gap-3 mb-4">
                          {exchangeItemDetails.variants.map((v) => {
                            const colorName = v.color?.name ?? ''
                            const isSelected = exchangeDesiredColor === colorName
                            const imgUrl = v.images?.[0]?.url ?? (v.images && v.images[0] && v.images[0].url)
                            return (
                              <button
                                key={colorName}
                                type="button"
                                onClick={() => {
                                  setExchangeDesiredColor(colorName)
                                  if (v.sizes?.length) setExchangeDesiredSize(v.sizes[0].size ?? '')
                                }}
                                className={`flex flex-col items-center rounded-lg border-2 p-1 transition-colors ${isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}
                              >
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded overflow-hidden bg-gray-100 shrink-0">
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={colorName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: v.color?.hex || '#e5e7eb' }} title={colorName} />
                                  )}
                                </div>
                                <span className="text-[10px] font-medium uppercase mt-1 text-gray-800">{colorName}</span>
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-xs font-semibold text-black uppercase mb-2">Select size</p>
                        <div className="flex flex-wrap gap-2">
                          {(exchangeItemDetails.variants.find((v) => v.color?.name === exchangeDesiredColor)?.sizes ?? []).map((s) => {
                            const sizeVal = s.size ?? ''
                            const isSelected = exchangeDesiredSize === sizeVal
                            return (
                              <button
                                key={s.sku ?? sizeVal}
                                type="button"
                                onClick={() => setExchangeDesiredSize(sizeVal)}
                                className={`px-4 py-2 rounded border text-xs font-semibold uppercase ${isSelected ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-800 hover:border-gray-500'}`}
                              >
                                {sizeVal}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {exchangeError && <p className="px-4 text-red-600 text-sm">{exchangeError}</p>}
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={exchangeModalContinue}
                      disabled={exchangeItemLoading || !exchangeItemDetails?.variants?.length || !exchangeDesiredColor.trim() || !exchangeDesiredSize.trim()}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 4 && (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-bold text-black uppercase">Upload photo</h3>
                    <button type="button" className="p-1 text-gray-500 hover:text-black text-lg" aria-label="Close" onClick={closeExchangeModal}>✕</button>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-600 mb-3">Upload 3 to 5 images of the item (required for exchange).</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                          {exchangeImages[i] ? (
                            <img src={URL.createObjectURL(exchangeImages[i])} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-2xl">📷</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <label className="block">
                      <span className="sr-only">Upload images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(0, 5)
                          setExchangeImages(files)
                        }}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:font-semibold file:uppercase file:bg-white file:text-black hover:file:bg-gray-50"
                      />
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1">Min 3, max 5 images. You have {exchangeImages.length} selected.</p>
                  </div>
                  {exchangeError && <p className="px-4 text-red-600 text-sm">{exchangeError}</p>}
                  <div className="p-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={exchangeModalContinue}
                      disabled={exchangeSubmitting || exchangeImages.length < 3}
                      className="w-full bg-black text-white py-3 text-xs font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {exchangeSubmitting ? 'Submitting…' : 'Continue'}
                    </button>
                  </div>
                </>
              )}
              {exchangeStep === 5 && (
                <>
                  <div className="flex justify-end p-4">
                    <button type="button" className="p-1 text-gray-500 hover:text-black" aria-label="Close" onClick={closeExchangeModal}>✕</button>
                  </div>
                  <div className="px-4 pb-6 pt-0 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="font-bold text-black uppercase text-lg mb-2">Exchange request submitted</h3>
                    <p className="text-sm text-gray-600">Your exchange request has been received. We will process it shortly.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
