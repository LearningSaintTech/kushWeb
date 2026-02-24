/**
 * Order API – create, verify-payment, order items.
 * Base path: /order
 * Requires: user auth (except webhook – server-only)
 */

import client from './axiosClient.js';

const BASE = '/order';

export const orderService = {
  create: (body) => client.post(`${BASE}/create`, body),

  verifyPayment: (body) => client.post(`${BASE}/verify-payment`, body),

  getOrderItems: (params = {}) => client.get(`${BASE}/items`, { params }),

  getOrderItemById: (itemId) => client.get(`${BASE}/items/${itemId}`),
};
