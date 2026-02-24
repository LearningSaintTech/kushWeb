/**
 * Delivery & pincode API – serviceable pincode check, delivery options, cart charges.
 * Base paths: /servicablePincode, /delivery, /cart-charges
 */

import client from './axiosClient.js';

export const servicablePincodeService = {
  check: (pinCode) => client.get(`/servicablePincode/check/${pinCode}`),

  getAll: () => client.get('/servicablePincode/getAll'),

  getSingle: (pinCode) => client.get(`/servicablePincode/getSingle/${pinCode}`),
};

export const deliveryService = {
  getAll: () => client.get('/delivery/getAll'),

  checkByPincode: (pinCode) => client.get(`/delivery/check/${pinCode}`),

  getById: (id) => client.get(`/delivery/getSingle/${id}`),
};

export const cartChargesService = {
  getActive: () => client.get('/cart-charges/getAll-active'),

  getSingle: (id) => client.get(`/cart-charges/getSingle/${id}`),
};
