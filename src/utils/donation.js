/** Default preset donation (₹2) — matches backend checkout contract. */
export const DEFAULT_DONATION_AMOUNT = 2

export const DONATION_PRESETS = [2, 5, 10, 20]

export const DONATION_MAX_AMOUNT = 10000

/** Amount shown in bill summary — UI state first, then price-summary / cart root. */
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

/** Ensure payable total includes donation when API summary omits the donation field. */
export function applyDonationToFinalPayable({
  finalPayable,
  taxableAmount,
  subTotal,
  donationLineAmount,
  donationIncludedInSummary,
}) {
  const base = Number(finalPayable ?? (taxableAmount > 0 ? taxableAmount : subTotal) ?? 0)
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
  const presetUsed = !!cartDonation.presetUsed
  return {
    donationEnabled: true,
    donationAmount: Number.isFinite(amount) && amount > 0 ? String(amount) : String(DEFAULT_DONATION_AMOUNT),
    donationPresetUsed: presetUsed,
    donationCustomMode: !presetUsed,
  }
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
