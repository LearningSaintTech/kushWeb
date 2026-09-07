import { PAYMENT_MODES } from './paymentMode.js'

/** Whether a charge applies for the current payment mode (or cart when mode is unset). */
export function chargeAppliesToPaymentMode(charge, paymentMode) {
  if (charge?.isCODSpecial) {
    return paymentMode === PAYMENT_MODES.COD
  }
  if (charge?.israzorpaySpecial) {
    return paymentMode === PAYMENT_MODES.RAZORPAY
  }
  return true
}

/** Charges visible in bill summary for cart (no payment mode) or checkout. */
export function filterChargesForPaymentMode(charges, paymentMode) {
  if (!Array.isArray(charges)) return []
  if (!paymentMode) {
    return charges.filter((c) => !c.isCODSpecial && !c.israzorpaySpecial)
  }
  return charges.filter((c) => chargeAppliesToPaymentMode(c, paymentMode))
}

/** Adjust summary totals when payment-mode-specific charges are hidden from the UI. */
export function adjustSummaryForPaymentModeCharges(summary, paymentMode) {
  const allCharges = Array.isArray(summary?.charges) ? summary.charges : []
  const visibleCharges = filterChargesForPaymentMode(allCharges, paymentMode)
  const visibleTotal = visibleCharges.reduce(
    (sum, c) => sum + Number(c?.amount ?? 0),
    0,
  )
  const allTotal = allCharges.reduce(
    (sum, c) => sum + Number(c?.amount ?? 0),
    0,
  )
  const hiddenTotal = Math.max(0, allTotal - visibleTotal)

  const taxableAmount = Math.max(
    0,
    Number(summary?.taxableAmount ?? 0) - hiddenTotal,
  )
  const finalPayableBeforeDonation = Math.max(
    0,
    Number(
      summary?.finalPayableBeforeDonation ??
        summary?.finalPayable ??
        summary?.taxableAmount ??
        0,
    ) - hiddenTotal,
  )
  const finalPayable = Math.max(
    0,
    Number(summary?.finalPayable ?? summary?.taxableAmount ?? 0) - hiddenTotal,
  )

  return {
    visibleCharges,
    otherChargesTotal: visibleTotal,
    hiddenChargesTotal: hiddenTotal,
    taxableAmount,
    finalPayableBeforeDonation,
    finalPayable,
  }
}

/**
 * Check and compute applicable COD charges from summary charges array or active cart charge configs.
 */
export function getApplicableCodCharge({
  charges = [],
  activeCartCharges = [],
  subTotal = 0,
} = {}) {
  // 1. Check if summary already contains an isCODSpecial charge with amount > 0
  if (Array.isArray(charges)) {
    const codCharge = charges.find(
      (c) => Boolean(c?.isCODSpecial) && Number(c?.amount ?? 0) > 0,
    )
    if (codCharge) {
      return Number(codCharge.amount ?? 0)
    }
  }

  // 2. Check active cart charge rules (e.g. from /cart-charges/getAll-active)
  const chargeGroups = Array.isArray(activeCartCharges)
    ? activeCartCharges
    : Array.isArray(activeCartCharges?.data)
      ? activeCartCharges.data
      : []

  for (const group of chargeGroups) {
    if (!group || group.isActive === false) continue
    const items = Array.isArray(group.cartCharge) ? group.cartCharge : []
    for (const item of items) {
      if (!item || !item.isCODSpecial) continue
      const rules = item.rules
      if (!rules) continue
      const min = rules.min != null ? Number(rules.min) : 0
      const max = rules.max != null ? Number(rules.max) : Infinity
      const val = Number(rules.value ?? 0)
      if (val > 0 && subTotal >= min && subTotal <= max) {
        if (rules.type === 'PERCENT') {
          return (Number(subTotal) * val) / 100
        }
        return val
      }
    }
  }

  return 0
}

