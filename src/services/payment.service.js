/**
 * Payment API – create-order, verify-payment, order-status (polling).
 * Base path: /payment
 * Requires: user auth
 */

import client from './axiosClient.js';

const BASE = '/payment';

function logReq(label, ...args) {
  console.log(`[PaymentService] ${label} REQ`, ...args);
}
function logRes(label, data) {
  console.log(`[PaymentService] ${label} RES`, data);
}
function logErr(label, err) {
  console.error(`[PaymentService] ${label} ERR`, err?.response?.data ?? err?.message ?? err);
}

export const paymentService = {
  /** Create order (Razorpay or COD). Body: { addressId, paymentMode: 'RAZORPAY'|'COD', couponCode? } */
  createOrder: (body) => {
    logReq('createOrder', body);
    return client.post(`${BASE}/create-order`, body).then((res) => {
      logRes('createOrder', res?.data);
      return res;
    }).catch((err) => {
      logErr('createOrder', err);
      throw err;
    });
  },

  /** Verify Razorpay payment. Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature } */
  verifyPayment: (body) => {
    logReq('verifyPayment', { ...body, razorpay_signature: body?.razorpay_signature ? '(redacted)' : undefined });
    return client.post(`${BASE}/verify-payment`, body).then((res) => {
      logRes('verifyPayment', res?.data);
      return res;
    }).catch((err) => {
      logErr('verifyPayment', err);
      throw err;
    });
  },

  /** Get minimal order status for polling. Returns { orderId, status, payment: { status } } */
  getOrderStatus: (orderId) => {
    logReq('getOrderStatus', { orderId });
    return client.get(`${BASE}/order-status/${encodeURIComponent(orderId)}`).then((res) => {
      logRes('getOrderStatus', res?.data);
      return res;
    }).catch((err) => {
      logErr('getOrderStatus', err);
      throw err;
    });
  },
};
