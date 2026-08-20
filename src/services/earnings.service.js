import client from './axiosClient.js'

const BASE = '/earnings'

/** Normalize backend `{ success, message, data }` envelopes */
export function unwrapEarningsResponse(res) {
  return res?.data?.data ?? res?.data ?? null
}

/**
 * Creator / designer earnings APIs.
 * GET    /earnings/summary
 * GET    /earnings/commissions?page=&limit=
 * GET    /earnings/payout-methods
 * POST   /earnings/payout-methods
 * DELETE /earnings/payout-methods/:methodId
 * GET    /earnings/payouts
 * POST   /earnings/payouts  { amount, methodId }
 */
export const earningsService = {
  getSummary: () => client.get(`${BASE}/summary`),

  getCommissions: (params = {}) =>
    client.get(`${BASE}/commissions`, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...params,
      },
    }),

  getPayoutMethods: () => client.get(`${BASE}/payout-methods`),

  /** Body: { type, bankName, accountHolderName, accountNumber, ifsc, isDefault } */
  savePayoutMethod: (body) => client.post(`${BASE}/payout-methods`, body),

  deletePayoutMethod: (methodId) =>
    client.delete(`${BASE}/payout-methods/${methodId}`),

  getPayouts: (params = {}) =>
    client.get(`${BASE}/payouts`, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...params,
      },
    }),

  /** Body: { amount, methodId } */
  createPayout: (body) => client.post(`${BASE}/payouts`, body),
}
