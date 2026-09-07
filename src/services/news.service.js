/**
 * News / Press API – list active, single (public read).
 * Base path: /news
 */

import client from './axiosClient.js';

const BASE = '/news';

export const newsService = {
  /** Get active news items */
  getActive: (params) => client.get(`${BASE}/getActive`, { params }),

  /** Get all news items (admin/full) */
  getAll: (params) => client.get(`${BASE}/getAll`, { params }),

  /** Get single news item by ID */
  getSingle: (id) => client.get(`${BASE}/getSingle/${id}`),
};
