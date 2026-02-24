/**
 * Brands API – list, single (public read).
 * Base path: /brands
 */

import client from './axiosClient.js';

const BASE = '/brands';

export const brandsService = {
  getAll: () => client.get(`${BASE}/getAll`),

  getSingle: (id) => client.get(`${BASE}/getSingle/${id}`),
};
