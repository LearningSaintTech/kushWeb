/**
 * Cart API – add, my cart, delivery address, qty, remove, clear, price summary.
 * Base path: /cart
 * Requires: user auth
 */

import client from './axiosClient.js';

const BASE = '/cart';

export const cartService = {
  add: (body) => client.post(`${BASE}/add`, body),

  my: (params = {}) => client.get(`${BASE}/my`, { params }),

  setDeliveryAddress: (body) => client.patch(`${BASE}/delivery-address`, body),

  selectDelivery: (body) => client.patch(`${BASE}/select-delivery`, body),

  remove: (sku) => client.delete(`${BASE}/remove/${sku}`),

  increaseQty: (sku) => client.patch(`${BASE}/increaseqty/${sku}`),

  decreaseQty: (sku) => client.patch(`${BASE}/decreaseqty/${sku}`),

  clear: () => client.delete(`${BASE}/clear`),

  getPriceSummary: () => client.get(`${BASE}/price-summary`),

  getPriceSummaryPost: () => client.post(`${BASE}/price-summary`),
};
