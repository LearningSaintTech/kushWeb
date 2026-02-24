/**
 * Address API – create, getAll, update, default, delete, guest, getDefault.
 * Base path: /address
 * Requires: user auth (except guest)
 */

import client from './axiosClient.js';

const BASE = '/address';

export const addressService = {
  create: (body) => client.post(`${BASE}/create`, body),

  getAll: () => client.get(`${BASE}/getAll`),

  update: (id, body) => client.patch(`${BASE}/update/${id}`, body),

  setDefault: (id) => client.patch(`${BASE}/default/${id}`),

  delete: (id) => client.delete(`${BASE}/delete/${id}`),

  guest: (body) => client.post(`${BASE}/guest`, body),

  getDefaultAddress: () => client.get(`${BASE}/getDefaultAddress`),
};
