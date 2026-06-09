import { trackEvent } from '../../analytics'
import { ROUTES } from '../../utils/constants'

/**
 * Build router state for the order thank-you page (includes conversion payload).
 */
export function buildThankYouNavigateState({
  orderId,
  paymentMode,
  value,
  currency = 'INR',
  items = [],
}) {
  const lineItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      const product = item?.itemId ?? item?.item ?? item?.product ?? item
      const id =
        product?._id ??
        product?.id ??
        item?.productId ??
        item?.sku ??
        null
      if (!id) return null
      return {
        id: String(id),
        quantity: Number(item?.quantity) || 1,
        name: product?.name ?? item?.name ?? undefined,
        price:
          item?.unitPrice != null
            ? Number(item.unitPrice)
            : item?.finalPayable != null
              ? Number(item.finalPayable)
              : undefined,
      }
    })
    .filter(Boolean)

  const numItems = lineItems.reduce((sum, row) => sum + (row.quantity || 1), 0)

  return {
    orderId,
    orderSuccess: true,
    paymentMode,
    conversion: {
      orderId: orderId != null ? String(orderId) : undefined,
      value: value != null ? Number(value) : 0,
      currency,
      numItems,
      items: lineItems,
    },
  }
}

function purchaseStorageKey(orderId) {
  return `khush_purchase_tracked_${orderId}`
}

/**
 * Fire Meta Pixel Purchase + GTM dataLayer purchase (once per order per session).
 */
export function trackOrderConversion(conversion) {
  const orderId = conversion?.orderId
  if (!orderId) return

  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    const key = purchaseStorageKey(orderId)
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  }

  const value = Number(conversion.value || 0)
  const currency = conversion.currency || 'INR'
  const items = Array.isArray(conversion.items) ? conversion.items : []
  const contents = items.map((row) => ({
    id: row.id,
    quantity: row.quantity ?? 1,
  }))
  const contentIds = items.map((row) => row.id).filter(Boolean)
  const numItems =
    conversion.numItems ??
    contents.reduce((sum, row) => sum + (row.quantity || 1), 0)

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_type: 'product',
      content_ids: contentIds,
      contents,
      num_items: numItems,
    })
  }

  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: String(orderId),
        value,
        currency,
        items: items.map((row, index) => ({
          item_id: row.id,
          item_name: row.name,
          price: row.price,
          quantity: row.quantity ?? 1,
          index,
        })),
      },
      meta: {
        orderId: String(orderId),
        value,
        currency,
        num_items: numItems,
      },
    })
  }

  trackEvent({
    eventType: 'order_conversion',
    orderId: String(orderId),
    cartValue: value,
    currency,
    meta: { numItems, itemIds: contentIds },
  })
}

export function navigateToThankYou(navigate, params, options = {}) {
  navigate(ROUTES.ORDER_THANK_YOU, {
    ...options,
    state: buildThankYouNavigateState(params),
  })
}

export function buildOrderFailedNavigateState({
  orderId,
  paymentMode,
  reason = 'payment_failed',
  message,
  value,
}) {
  return {
    orderId,
    paymentMode,
    reason,
    message,
    value: value != null ? Number(value) : undefined,
  }
}

export function buildOrderCancelledNavigateState({
  orderId,
  itemId,
  reason,
  paymentMode,
  isCod,
}) {
  return {
    orderId,
    itemId,
    reason,
    paymentMode,
    isCod,
  }
}

function eventStorageKey(prefix, id) {
  return `khush_${prefix}_tracked_${id}`
}

export function trackOrderFailedEvent(payload = {}) {
  const orderId = payload?.orderId
  const reason = payload?.reason || 'payment_failed'
  const key = orderId ? eventStorageKey('order_failed', orderId) : null

  if (key && typeof sessionStorage !== 'undefined') {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  }

  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'order_failed',
      order_id: orderId ? String(orderId) : undefined,
      reason,
      payment_mode: payload?.paymentMode,
      message: payload?.message,
    })
  }

  trackEvent({
    eventType: 'order_failed',
    orderId: orderId ? String(orderId) : undefined,
    meta: {
      reason,
      paymentMode: payload?.paymentMode,
      message: payload?.message,
    },
  })
}

export function trackOrderCancelledEvent(payload = {}) {
  const orderId = payload?.orderId
  const itemId = payload?.itemId
  const key =
    orderId && itemId
      ? eventStorageKey('order_cancelled', `${orderId}_${itemId}`)
      : orderId
        ? eventStorageKey('order_cancelled', orderId)
        : null

  if (key && typeof sessionStorage !== 'undefined') {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  }

  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'order_cancelled',
      order_id: orderId ? String(orderId) : undefined,
      item_id: itemId ? String(itemId) : undefined,
      reason: payload?.reason,
      payment_mode: payload?.paymentMode,
    })
  }

  trackEvent({
    eventType: 'order_cancelled',
    orderId: orderId ? String(orderId) : undefined,
    meta: {
      itemId: itemId ? String(itemId) : undefined,
      reason: payload?.reason,
      paymentMode: payload?.paymentMode,
    },
  })
}

export function navigateToOrderFailed(navigate, params, options = {}) {
  navigate(ROUTES.ORDER_FAILED, {
    ...options,
    state: buildOrderFailedNavigateState(params),
  })
}

export function navigateToOrderCancelled(navigate, params, options = {}) {
  navigate(ROUTES.ORDER_CANCELLED, {
    ...options,
    state: buildOrderCancelledNavigateState(params),
  })
}
