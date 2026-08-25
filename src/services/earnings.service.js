import client from './axiosClient.js'

const BASE = '/earnings'

/** Normalize backend `{ success, message, data }` envelopes */
export function unwrapEarningsResponse(res) {
  return res?.data?.data ?? res?.data ?? null
}

/**
 * Creator / designer earnings APIs.
 * GET    /earnings/summary?role=creator|designer
 * GET    /earnings/commissions?role=&page=&limit=
 * GET    /earnings/payout-methods
 * POST   /earnings/payout-methods
 * DELETE /earnings/payout-methods/:methodId
 * GET    /earnings/payouts
 * POST   /earnings/payouts  { amount, methodId }
 */
function normalizeRole(role) {
  const r = String(role || '').toLowerCase().trim()
  if (r === 'creator' || r === 'designer') return r
  return undefined
}

function earningsQueryParams(params = {}) {
  const cleaned = {}
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    cleaned[k] = v
  })
  const role = normalizeRole(cleaned.role)
  if (role) cleaned.role = role
  else delete cleaned.role
  return cleaned
}

export const earningsService = {
  /** @param {{ role?: 'creator'|'designer', range?: string, dateRange?: string, days?: number }} [params] */
  getSummary: (params = {}) =>
    client.get(`${BASE}/summary`, { params: earningsQueryParams(params) }),

  /** @param {{ role?: 'creator'|'designer', page?: number, limit?: number, range?: string, days?: number }} [params] */
  getCommissions: (params = {}) =>
    client.get(`${BASE}/commissions`, {
      params: earningsQueryParams({
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...params,
      }),
    }),

  getPayoutMethods: () => client.get(`${BASE}/payout-methods`),

  /** Body: { type, bankName, accountHolderName, accountNumber, ifsc, isDefault } */
  savePayoutMethod: (body) => client.post(`${BASE}/payout-methods`, body),

  deletePayoutMethod: (methodId) =>
    client.delete(`${BASE}/payout-methods/${methodId}`),

  getPayouts: (params = {}) =>
    client.get(`${BASE}/payouts`, {
      params: earningsQueryParams({
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...params,
      }),
    }),

  /** Body: { amount, methodId } */
  createPayout: (body) => client.post(`${BASE}/payouts`, body),
}
