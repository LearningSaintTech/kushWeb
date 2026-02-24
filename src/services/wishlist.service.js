/**
 * Wishlist API – toggle, get items, get ids.
 * Base path: /wishlist (under API_BASE_URL e.g. /api/wishlist)
 * Requires: user auth
 */

import client from './axiosClient.js';

const BASE = '/wishlist';

export const wishlistService = {
  /** POST /wishlist/toggle – body: { itemId } – toggles item in wishlist */
  toggle: (body) => client.post(`${BASE}/toggle`, body),

  /** GET /wishlist/items – query: page, limit, pincode (optional) – returns { items, deliveries, pagination } */
  getItems: (params = {}) => client.get(`${BASE}/items`, { params }),

  /** GET /wishlist/ids – returns array of item IDs in wishlist */
  getIds: () => client.get(`${BASE}/ids`),
};
