/**
 * Coupons API – available for user, validate code.
 * Base path: /coupons
 * Requires: user auth for user-facing routes
 */

import client from './axiosClient.js';

const BASE = '/coupons';

export const couponsService = {
  getAvailable: () => client.get(`${BASE}/availableCoupons`),

  validate: (code) => client.get(`${BASE}/validate/${encodeURIComponent(code)}`),

  getSingle: (id) => client.get(`${BASE}/getSingle/${id}`),
};
