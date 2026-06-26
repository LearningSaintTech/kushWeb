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
