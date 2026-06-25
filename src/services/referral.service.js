import client from './axiosClient.js'

const BASE = '/referral'

/** Normalize backend `{ success, message, data }` envelopes */
export function unwrapReferralResponse(res) {
  return res?.data?.data ?? res?.data
}

export const referralService = {
  /** Public — no auth. Body: `{ code }` (4–16 chars). */
  validateReferralCode: (code) =>
    client.post(`${BASE}/validate-referral-code`, { code }),

  /** Authenticated user */
  getMyCode: () => client.get(`${BASE}/my-code`),

  getDashboard: () => client.get(`${BASE}/dashboard`),

  getEarnings: () => client.get(`${BASE}/earnings`),

  /** Query: `page`, `limit` (max 50), optional `status` */
  getHistory: (params) => client.get(`${BASE}/history`, { params: params || {} }),

  /** Public config — reward amount, flags (sanitized; no admin metadata). */
  getPublicConfig: () => client.get(`${BASE}/config`),
}
