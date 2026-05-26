/**
 * Client-side payment checkout helpers (Razorpay + Nimble/Nimbbl Sonic).
 */

import Checkout from 'nimbbl_sonic'
import { ROUTES } from '../../utils/constants'

/** CDN fallback if something still loads checkout via script tag (not used by openNimbleCheckout). */
export const DEFAULT_NIMBLE_SCRIPT =
  'https://cdn.jsdelivr.net/npm/nimbbl_sonic@6.2.0/build/browser/index.js'

let checkoutReady = Promise.resolve(Checkout)

/** Warm up the Sonic SDK (safe to call when user selects NIMBLE). */
export function preloadNimbleCheckout() {
  return checkoutReady
}

/** @deprecated Use preloadNimbleCheckout — kept for existing imports. */
export function loadNimbleScript() {
  return preloadNimbleCheckout()
}

export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

export function getNimbleReturnUrl() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}${ROUTES.CHECKOUT_NIMBLE_CALLBACK}`
}

const NIMBBL_SUCCESS_STATUSES = new Set([
  'success',
  'succeeded',
  'paid',
  'completed',
  'captured',
  'approved',
])

const NIMBBL_FAILURE_STATUSES = new Set([
  'failed',
  'failure',
  'cancelled',
  'canceled',
  'error',
  'declined',
])

function readNimbblStatus(response) {
  if (!response || typeof response !== 'object') return ''
  return String(
    response.status ??
      response.payment_status ??
      response.transaction_status ??
      response.order?.status ??
      response.payment?.status ??
      ''
  ).toLowerCase()
}

export function buildNimbblVerifyBody(response, { nimbleOrderId, businessOrderId } = {}) {
  const orderId =
    response?.nimbbl_order_id ??
    response?.order_id ??
    nimbleOrderId ??
    null
  const transactionId =
    response?.nimbbl_transaction_id ??
    response?.transaction_id ??
    null

  return {
    ...(response && typeof response === 'object' ? response : {}),
    order_id: orderId,
    nimbbl_order_id: response?.nimbbl_order_id ?? orderId,
    transaction_id: transactionId,
    nimbbl_transaction_id: response?.nimbbl_transaction_id ?? transactionId,
    nimbbl_signature: response?.nimbbl_signature ?? response?.signature ?? null,
    status: readNimbblStatus(response) || (transactionId ? 'success' : undefined),
    invoice_id: response?.order?.invoice_id ?? businessOrderId,
  }
}

export function hasNimbblVerifyPayload(response, { nimbleOrderId } = {}) {
  const body = buildNimbblVerifyBody(response, { nimbleOrderId })
  return Boolean(body.order_id && body.transaction_id)
}

export function isNimbblPaymentSuccess(response) {
  const status = readNimbblStatus(response)
  if (NIMBBL_SUCCESS_STATUSES.has(status)) return true
  if (NIMBBL_FAILURE_STATUSES.has(status)) return false
  // Nimbbl sometimes omits status but includes transaction ids on success.
  return hasNimbblVerifyPayload(response)
}

/** User closed checkout or payment was cancelled / failed — do not poll for success. */
export function isNimbblPaymentCancelled(response) {
  const status = readNimbblStatus(response)
  if (
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'failed' ||
    status === 'failure' ||
    status === 'declined' ||
    status === 'error'
  ) {
    return true
  }
  if (!response || typeof response !== 'object') return true
  const keys = Object.keys(response)
  if (keys.length === 0) return true
  if (isNimbblPaymentSuccess(response)) return false
  if (hasNimbblVerifyPayload(response)) return false
  return true
}

/** Only poll order-status when callback hints payment may have completed. */
export function shouldPollNimbblOrderStatus(response) {
  if (isNimbblPaymentSuccess(response)) return false
  if (isNimbblPaymentCancelled(response)) return false
  return hasNimbblVerifyPayload(response)
}

/** Typical BNPL minimum on Nimbbl (override via VITE_NIMBLE_MIN_AMOUNT). 0 = no hint threshold. */
export const NIMBLE_MIN_ORDER_AMOUNT = Number(import.meta.env.VITE_NIMBLE_MIN_AMOUNT ?? 500)

export function isBelowNimblePayLaterMinimum(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return false
  if (!NIMBLE_MIN_ORDER_AMOUNT || NIMBLE_MIN_ORDER_AMOUNT <= 0) return false
  return n < NIMBLE_MIN_ORDER_AMOUNT
}

function flattenPaymentModeItems(modesPayload) {
  const body = modesPayload?.data ?? modesPayload ?? {}
  const items = []
  const trays = [body.fast_payment_modes, body.other_payment_modes]

  for (const tray of trays) {
    if (!tray) continue
    if (Array.isArray(tray.items)) items.push(...tray.items)
    if (typeof tray === 'object' && !Array.isArray(tray) && tray.items) {
      items.push(...(Array.isArray(tray.items) ? tray.items : []))
    }
    if (Array.isArray(tray)) {
      for (const group of tray) {
        if (Array.isArray(group?.items)) items.push(...group.items)
      }
    }
  }

  const visited = new WeakSet()
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 8) return
    if (visited.has(node)) return
    visited.add(node)
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, depth + 1))
      return
    }
    if (node.payment_mode || node.pay_later_code || node.pay_later_name) {
      items.push(node)
    }
    Object.values(node).forEach((child) => walk(child, depth + 1))
  }
  walk(body)

  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.payment_mode}|${item.pay_later_code}|${item.pay_later_name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function labelLooksLikePayLater(text) {
  const s = String(text ?? '').toLowerCase()
  return (
    s.includes('pay later') ||
    s.includes('paylater') ||
    s.includes('bnpl') ||
    s.includes('lazy') ||
    s.includes('simpl') ||
    s.includes('zest') ||
    s.includes('amazon pay later')
  )
}

function isPayLaterMode(mode) {
  if (!mode || typeof mode !== 'object') return false
  const paymentMode = String(mode.payment_mode ?? '').toLowerCase()
  const tray = String(
    mode.parent_display_tray ??
      mode.display_tray ??
      mode.display_description ??
      mode.display_tray_name ??
      ''
  ).toLowerCase()
  return (
    Boolean(mode.pay_later_code || mode.pay_later_name) ||
    labelLooksLikePayLater(paymentMode) ||
    labelLooksLikePayLater(tray) ||
    labelLooksLikePayLater(mode.app_name)
  )
}

/** List Pay Later providers returned by Nimbbl for this order token. */
export async function getNimblePayLaterOptions(orderToken) {
  const CheckoutCtor = await preloadNimbleCheckout()
  const checkout = new CheckoutCtor({ token: orderToken })
  const res = await checkout.getPaymentModes()
  const body = res?.data ?? res ?? {}
  const fromItems = flattenPaymentModeItems(res).filter(isPayLaterMode)
  const fromSummary = (body.available_payment_modes ?? [])
    .filter(labelLooksLikePayLater)
    .map((label) => ({ payment_mode: label, pay_later_name: label }))
  const payLater = [...fromItems, ...fromSummary]
  return { raw: res, payLater, availableModes: body.available_payment_modes ?? [] }
}

export function formatNimblePayLaterUnavailableMessage({ amount, payLaterCount = 0 } = {}) {
  const lines = []
  if (Number.isFinite(amount) && amount > 0 && amount < NIMBLE_MIN_ORDER_AMOUNT) {
    lines.push(
      `Order total is ₹${amount.toFixed(2)}. Pay Later on Nimbbl usually needs at least ₹${NIMBLE_MIN_ORDER_AMOUNT}.`
    )
  }
  if (payLaterCount === 0) {
    lines.push(
      'No Pay Later option is enabled for your Nimbbl merchant account or this customer yet.'
    )
    lines.push(
      'In Nimbbl Command Center, enable Pay Later / BNPL, then retry with a higher cart value.'
    )
  }
  return lines.join(' ')
}

const NIMBBL_HOST_PATTERN = /sonic\.nimbbl\.tech|nimbbl\.tech/i

function findNimbblCheckoutFrame() {
  if (typeof document === 'undefined') return null

  for (const iframe of document.querySelectorAll('iframe')) {
    const src = iframe.src || iframe.getAttribute('src') || ''
    if (NIMBBL_HOST_PATTERN.test(src)) return iframe
  }

  for (const iframe of document.querySelectorAll('iframe')) {
    const name = `${iframe.id || ''} ${iframe.className || ''}`.toLowerCase()
    if (name.includes('nimbbl') || name.includes('sonic')) return iframe
  }

  return null
}

function isNimbblCheckoutVisible() {
  const iframe = findNimbblCheckoutFrame()
  if (!iframe) return false
  const rect = iframe.getBoundingClientRect()
  return rect.width >= 200 && rect.height >= 200
}

/**
 * Wait until Nimbbl Sonic mounts a visible checkout iframe (or overlay).
 */
export function waitForNimbblCheckoutVisible({ timeoutMs = 25000, pollMs = 120 } = {}) {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }
  if (isNimbblCheckoutVisible()) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      observer.disconnect()
      clearInterval(interval)
      clearTimeout(timer)
    }
    const finish = (ok) => {
      if (settled) return
      settled = true
      cleanup()
      if (ok) resolve()
      else reject(new Error('Nimbbl checkout did not open in time. Please try again.'))
    }

    const observer = new MutationObserver(() => {
      if (isNimbblCheckoutVisible()) finish(true)
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })

    const interval = setInterval(() => {
      if (isNimbblCheckoutVisible()) finish(true)
    }, pollMs)

    const timer = setTimeout(() => finish(false), timeoutMs)
  })
}

/**
 * Open Nimbbl Sonic checkout modal with the server-created order token.
 * Resolves when the modal has been launched (not when the user finishes paying).
 * @see https://nimbbl.biz/docs/standard-checkout/setting-client/creating-your-checkout-page/
 */
export async function openNimbleCheckout({
  orderToken,
  onSuccess,
  onFailure,
  onOpened,
  onClosed,
}) {
  if (!orderToken) {
    throw new Error('Missing Nimble order token')
  }

  const CheckoutCtor = await preloadNimbleCheckout()
  const checkout = new CheckoutCtor({ token: orderToken })

  let openedNotified = false
  const notifyOpened = () => {
    if (openedNotified) return
    openedNotified = true
    onOpened?.()
  }

  const openPromise = checkout.open({
    callback_handler: async (response) => {
      console.log('[Nimbbl] callback_handler:', response)
      const shouldVerify =
        isNimbblPaymentSuccess(response) || hasNimbblVerifyPayload(response)
      if (shouldVerify) {
        await onSuccess?.(response)
      } else {
        onFailure?.(response)
      }
    },
  })

  // openPromise resolves when the user closes the modal — do not await it here.
  if (openPromise && typeof openPromise.then === 'function') {
    openPromise
      .catch((err) => {
        console.error('[Nimbbl] checkout session ended with error:', err)
      })
      .finally(() => {
        onClosed?.()
      })
  }

  console.log('[Nimbbl] waiting for checkout UI to become visible…')
  await waitForNimbblCheckoutVisible()
  console.log('[Nimbbl] checkout UI visible')
  notifyOpened()

  return checkout
}
