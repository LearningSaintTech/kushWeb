/**
 * Reviews API – create, get by item, delete, update.
 * Base path: /reviews
 */

import client from './axiosClient.js';

const BASE = '/reviews';

export const reviewsService = {
  create: (body) => client.post(`${BASE}/create`, body),

  getByItem: (itemId) => client.get(`${BASE}/getAll/${itemId}`),

  getSingle: (reviewId) => client.get(`${BASE}/getSingle/${reviewId}`),

  delete: (reviewId) => client.delete(`${BASE}/delete/${reviewId}`),

  update: (reviewId, body) => client.patch(`${BASE}/update/${reviewId}`, body),
};
