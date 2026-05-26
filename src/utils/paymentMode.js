/**
 * Shared payment mode helpers (COD, Razorpay, Nimble BNPL).
 */

export const PAYMENT_MODES = {
  COD: 'COD',
  RAZORPAY: 'RAZORPAY',
  NIMBLE: 'NIMBLE',
}

/** Normalize order / line-item payment mode from API shapes. */
export function resolvePaymentMode(data) {
  const raw =
    data?.payment?.mode ??
    data?.item?.paymentMode ??
    data?.paymentMode ??
    ''
  const mode = String(raw).trim().toUpperCase()
  if (mode === 'PREPAID') return PAYMENT_MODES.RAZORPAY
  return mode
}

export function getPaymentModeLabel(data) {
  const mode = resolvePaymentMode(data)
  if (mode === PAYMENT_MODES.COD) return 'Cash on Delivery'
  if (mode === PAYMENT_MODES.NIMBLE) return 'Buy now, pay later'
  if (mode === PAYMENT_MODES.RAZORPAY) return 'Online payment'
  if (mode === 'PREPAID') return 'Prepaid'
  return mode || '—'
}

export function isCodPayment(data) {
  return resolvePaymentMode(data) === PAYMENT_MODES.COD
}

/** Razorpay or Nimble BNPL (merchant paid upfront via gateway). */
export function isPrepaidPayment(data) {
  const mode = resolvePaymentMode(data)
  return mode === PAYMENT_MODES.RAZORPAY || mode === PAYMENT_MODES.NIMBLE
}

export function getPaymentStatus(data) {
  return String(data?.payment?.status ?? data?.item?.paymentStatus ?? '').toUpperCase()
}

export function getPaymentStatusLabel(data) {
  const status = getPaymentStatus(data)
  const map = {
    PENDING: 'Pending',
    SUCCESS: 'Paid',
    PAID: 'Paid',
    FAILED: 'Failed',
    COLLECTED: 'Collected',
  }
  return map[status] || (status ? status.replace(/_/g, ' ').toLowerCase() : '')
}

export function formatPaymentLine(data) {
  const modeLabel = getPaymentModeLabel(data)
  const status = getPaymentStatus(data)
  if (!status || status === 'SUCCESS' || status === 'PAID' || status === 'COLLECTED') {
    return modeLabel
  }
  const statusLabel = getPaymentStatusLabel(data)
  return `${modeLabel} · ${statusLabel}`
}
