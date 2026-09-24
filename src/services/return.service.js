/**
 * Return API – create and track return requests.
 * Backend: POST /api/return-user/create (multipart)
 */

import client from './axiosClient.js';

const BASE = '/return-user';

export const returnService = {
  /**
   * Create return request.
   * @param {{ orderId: string, itemId: string, reason: string, description?: string }} fields
   * @param {File | null} unboxingVideo
   * @param {File[]} evidenceImages - 3 to 5 product evidence images
   */
  createReturnRequest: (fields, unboxingVideo = null, evidenceImages = []) => {
    const form = new FormData();
    form.append('orderId', fields.orderId);
    form.append('itemId', fields.itemId);
    form.append('reason', fields.reason);
    if (fields.description != null && String(fields.description).trim()) {
      form.append('description', String(fields.description).trim());
    }
    if (unboxingVideo instanceof File) {
      form.append('unboxingVideo', unboxingVideo);
    }
    (Array.isArray(evidenceImages) ? evidenceImages : [])
      .filter((f) => f instanceof File)
      .slice(0, 5)
      .forEach((file) => {
        form.append('images', file);
      });
    return client.post(`${BASE}/create`, form);
  },

  getMyReturns: (params = {}) => client.get(`${BASE}/my-returns`, { params }),

  getReturnById: (returnId) => client.get(`${BASE}/${returnId}`),
};
