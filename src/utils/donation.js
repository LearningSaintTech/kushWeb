/** Default preset donation (₹2) — matches backend checkout contract. */
export const DEFAULT_DONATION_AMOUNT = 2

export const DONATION_MAX_AMOUNT = 10000

/** Restore UI state from cart API `donation` object or checkout navigation state. */
export function donationStateFromCart(cartDonation) {
  if (!cartDonation?.enabled) {
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
