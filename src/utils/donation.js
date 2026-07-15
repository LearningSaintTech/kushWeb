/** Default preset donation (₹2) — matches backend checkout contract. */
export const DEFAULT_DONATION_AMOUNT = 2

export const DONATION_PRESETS = [2, 5, 10, 20]

export const DONATION_MAX_AMOUNT = 10000

/** Read donation object from price-summary / cart API payloads. */
export function getDonationFromApiPayload(...sources) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    if (source.donation != null && typeof source.donation === 'object') {
      return source.donation
    }
    if (source.summary?.donation != null && typeof source.summary.donation === 'object') {
      return source.summary.donation
    }
    if (source.cartSummary?.donation != null && typeof source.cartSummary.donation === 'object') {
      return source.cartSummary.donation
    }
  }
  return null
}

/** Amount shown in bill summary — prefer UI when on; never show API donation while UI is off. */
export function resolveDonationLineAmount({
  summaryDonation,
  rootDonation,
  donationEnabled,
  donationAmount,
  donationPresetUsed,
}) {
  if (!donationEnabled) return 0

  const active = getActiveDonationAmount({
    donationEnabled,
    donationAmount,
    donationPresetUsed,
  })
  if (active != null && active > 0) return active

  const sources = [summaryDonation, rootDonation]
  for (const donation of sources) {
    if (donation?.enabled && Number(donation?.amount) > 0) {
      return Number(donation.amount)
    }
  }
  return 0
}

/**
 * Payable total for display.
 * If UI donation is off but a stale summary still includes donation, strip it from the total.
 */
export function applyDonationToFinalPayable({
  finalPayable,
  taxableAmount,
  subTotal,
  donationLineAmount,
  donationIncludedInSummary,
  donationEnabled = true,
  summaryDonationAmount = 0,
}) {
  const base = Number(finalPayable ?? (taxableAmount > 0 ? taxableAmount : subTotal) ?? 0)

  if (!donationEnabled && donationIncludedInSummary && Number(summaryDonationAmount) > 0) {
    return Math.max(0, base - Number(summaryDonationAmount))
  }

  if (donationLineAmount <= 0 || donationIncludedInSummary) return base

  const preDonationBase = Number(taxableAmount > 0 ? taxableAmount : base)
  if (Math.abs(base - preDonationBase) < 0.01) {
    return base + donationLineAmount
  }
  return base
}

/** Amount shown in heading and used for API when donation is on. */
export function getActiveDonationAmount({
  donationEnabled,
  donationAmount,
  donationPresetUsed,
}) {
  if (!donationEnabled) return null
  const resolved = resolveDonationAmount({
    donationEnabled,
    donationAmount,
    donationPresetUsed,
  })
  if (resolved.invalid) return null
  return resolved.amount
}

/** Restore UI state from cart API `donation` object or checkout navigation state. */
export function donationStateFromCart(cartDonation) {
  if (cartDonation == null) {
    return {
      donationEnabled: true,
      donationAmount: String(DEFAULT_DONATION_AMOUNT),
      donationPresetUsed: true,
      donationCustomMode: false,
    }
  }
  if (!cartDonation.enabled) {
    return {
      donationEnabled: false,
      donationAmount: '',
      donationPresetUsed: false,
      donationCustomMode: false,
    }
  }
  const amount = Number(cartDonation.amount)
  const normalizedAmount =
    Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_DONATION_AMOUNT
  const presetUsed =
    cartDonation.presetUsed != null
      ? !!cartDonation.presetUsed
      : DONATION_PRESETS.includes(normalizedAmount)
  return {
    donationEnabled: true,
    donationAmount: String(normalizedAmount),
    donationPresetUsed: presetUsed,
    donationCustomMode: !presetUsed,
  }
}

/** True when local donation UI already matches API donation object. */
export function isDonationUiInSync(ui, apiDonation) {
  const next = donationStateFromCart(apiDonation)
  return (
    Boolean(ui?.donationEnabled) === Boolean(next.donationEnabled) &&
    String(ui?.donationAmount ?? '') === String(next.donationAmount ?? '') &&
    Boolean(ui?.donationPresetUsed) === Boolean(next.donationPresetUsed)
  )
}

/** Resolved amount sent to price-summary / create-order. */
export function resolveDonationAmount({ donationEnabled, donationAmount, donationPresetUsed }) {
  if (!donationEnabled) {
    return { amount: 0, presetUsed: false }
  }
  if (donationPresetUsed) {
    return { amount: DEFAULT_DONATION_AMOUNT, presetUsed: true }
  }
  const n = Number(donationAmount)
  if (!Number.isFinite(n) || n < 0) {
    return { invalid: true }
  }
  if (n > DONATION_MAX_AMOUNT) {
    return { invalid: true, tooHigh: true }
  }
  return { amount: Math.round(n * 100) / 100, presetUsed: false }
}

/**
 * Query/body params for cart price-summary and order create.
 * When disabled, sends explicit false so backend clears saved cart preference.
 */
export function buildDonationApiParams({ donationEnabled, donationAmount, donationPresetUsed }) {
  if (!donationEnabled) {
    return {
      isDonationEnabled: 'false',
      donationAmount: '0',
      donationPresetUsed: 'false',
    }
  }
  const resolved = resolveDonationAmount({ donationEnabled, donationAmount, donationPresetUsed })
  if (resolved.invalid) return null
  return {
    isDonationEnabled: 'true',
    donationAmount: String(resolved.amount),
    donationPresetUsed: resolved.presetUsed ? 'true' : 'false',
  }
}

/** Payload for POST create-order (boolean/number types). */
export function buildDonationOrderBody({ donationEnabled, donationAmount, donationPresetUsed }) {
  if (!donationEnabled) {
    return {
      isDonationEnabled: false,
      donationAmount: 0,
      donationPresetUsed: false,
    }
  }
  const resolved = resolveDonationAmount({ donationEnabled, donationAmount, donationPresetUsed })
  if (resolved.invalid) return null
  return {
    isDonationEnabled: true,
    donationAmount: resolved.amount,
    donationPresetUsed: resolved.presetUsed,
  }
}
