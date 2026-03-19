/**
 * Reviews API – create, get by item, delete, update.
 * Base path: /reviews
 */

import client from './axiosClient.js';

const BASE = '/reviews';

export const reviewsService = {
  /**
   * Create a review for an item.
   * Supports optional image files (sent as multipart/form-data).
   * body: { itemId, rating, description?, files?: File[] }
   */
  create: (body) => {
    const formData = new FormData();
    if (body?.itemId != null) formData.append('itemId', body.itemId);
    if (body?.rating != null) formData.append('rating', String(body.rating));
    if (body?.description) formData.append('description', body.description);
    const files = Array.isArray(body?.files) ? body.files : [];
    files.forEach((file) => {
      if (file) formData.append('images', file);
    });
    return client.post(`${BASE}/create`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getByItem: (itemId, params = {}) =>
    client.get(`${BASE}/getAll/${itemId}`, { params: { page: params.page, limit: params.limit } }),

  getImagesByItem: (itemId) => client.get(`${BASE}/images/${itemId}`),

  getSingle: (reviewId) => client.get(`${BASE}/getSingle/${reviewId}`),

  delete: (reviewId) => client.delete(`${BASE}/delete/${reviewId}`),

  /**
   * Update an existing review.
   * body: { rating?, description?, files?: File[] }
   */
  update: (reviewId, body) => {
    const formData = new FormData();
    if (body?.rating != null) formData.append('rating', String(body.rating));
    if (body?.description != null) formData.append('description', body.description);
    const files = Array.isArray(body?.files) ? body.files : [];
    files.forEach((file) => {
      if (file) formData.append('images', file);
    });
    return client.patch(`${BASE}/update/${reviewId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
