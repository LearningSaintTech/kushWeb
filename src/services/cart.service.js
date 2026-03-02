/**
 * Cart API – add, my cart, delivery address, qty, remove, clear, price summary.
 * Base path: /cart
 * Requires: user auth
 */

import client from './axiosClient.js';

const BASE = '/cart';

export const cartService = {
  add: (body) => {
    console.log('[cart.service] add() called with body:', body)
    return client.post(`${BASE}/add`, body).then(
      (res) => {
        console.log('[cart.service] add() success:', res?.data)
        return res
      },
      (err) => {
        console.log('[cart.service] add() error:', err?.response?.data ?? err?.message, 'status:', err?.response?.status)
        throw err
      }
    )
  },

  my: (params = {}) =>
    client.get(`${BASE}/my`, { params }).then((res) => {
      const data = res?.data?.data ?? res?.data
      console.log("[cart.service] getCart (GET /cart/my) response:", data)
      return res
    }),

  setDeliveryAddress: (body) => client.patch(`${BASE}/delivery-address`, body),

  selectDelivery: (body) => client.patch(`${BASE}/select-delivery`, body),

  remove: (sku) => client.delete(`${BASE}/remove/${sku}`),

  increaseQty: (sku) => client.patch(`${BASE}/increaseqty/${sku}`),

  decreaseQty: (sku) => client.patch(`${BASE}/decreaseqty/${sku}`),

  clear: () => client.delete(`${BASE}/clear`),

  getPriceSummary: (params = {}) => client.get(`${BASE}/price-summary`, { params }),

  getPriceSummaryPost: () => client.post(`${BASE}/price-summary`),
};
