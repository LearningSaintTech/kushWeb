/**
 * Cart API – add, my cart, delivery address, qty, remove, clear, price summary.
 * Base path: /cart
 * Requires: user auth
 */

import client from './axiosClient.js';
import { debugLog, debugWarn } from '../utils/debugLog.js';

const BASE = '/cart';

function logCart(...args) {
  debugLog(...args);
}

export const cartService = {
  add: (body) => {
    logCart('[cart.service] add() called with body:', body)
    return client.post(`${BASE}/add`, body).then(
      (res) => {
        logCart('[cart.service] add() success:', res?.data)
        return res
      },
      (err) => {
        logCart('[cart.service] add() error:', err?.response?.data ?? err?.message, 'status:', err?.response?.status)
        throw err
      }
    )
  },

  my: (params = {}) =>
    client.get(`${BASE}/my`, { params }).then((res) => {
      const data = res?.data?.data ?? res?.data
      logCart("[cart.service] getCart (GET /cart/my) response:", data)
      return res
    }),

  setDeliveryAddress: (body) => client.patch(`${BASE}/delivery-address`, body),

  selectDelivery: (body) => client.patch(`${BASE}/select-delivery`, body),

  remove: (sku) => client.delete(`${BASE}/remove/${sku}`),

  increaseQty: (sku) => client.patch(`${BASE}/increaseqty/${sku}`),

  decreaseQty: (sku) => client.patch(`${BASE}/decreaseqty/${sku}`),

  clear: () => client.delete(`${BASE}/clear`),

  getPriceSummary: (params = {}) =>
    client.get(`${BASE}/price-summary`, { params }).then((res) => {
      const data = res?.data?.data ?? res?.data
      const summary = data?.cartSummary ?? data
      logCart("[cart.service] getPriceSummary (GET /cart/price-summary) response:", {
        itemCount: summary?.items?.length ?? 0,
        subTotal: summary?.summary?.subTotal,
        bindOffers: summary?.summary?.bindOffers ?? null,
        items: (summary?.items ?? []).map((line) => ({
          sku: line.sku,
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          itemSubtotal: line.itemSubtotal,
          bindOffer: line.bindOffer ?? null,
        })),
      })
      if (summary?.summary && summary.summary.bindOffers == null) {
        debugWarn(
          "[cart.service] price-summary missing summary.bindOffers — deploy latest KhushBackend or set VITE_API_URL in .env",
        )
      }
      return res
    }),

  getPriceSummaryPost: () => client.post(`${BASE}/price-summary`),
};
