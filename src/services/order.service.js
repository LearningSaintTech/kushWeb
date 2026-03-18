/**
 * Order API – create, verify-payment, order items.
 * Base path: /order
 * Requires: user auth (except webhook – server-only)
 */

import client from './axiosClient.js';

const BASE = '/order';

export const orderService = {
  /** Create order (place order). Body: { addressId, paymentMode: 'COD'|'RAZORPAY', couponCode?, razorpayPaymentData? } */
  create: (body) => client.post(`${BASE}/create`, body),

  /** Verify Razorpay payment after checkout. Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature } */
  verifyPayment: (body) => client.post(`${BASE}/verify-payment`, body),

  /** Get current user's order items (paginated). Params: page, limit, search, year, days, months, status */
  getOrderItems: (params = {}) => client.get(`${BASE}/items`, { params }),

  /** Get single order item. Backend: GET /order/items/:orderId/:itemId */
  getOrderItemById: (orderId, itemId) => client.get(`${BASE}/items/${orderId}/${itemId}`),

  /**
   * Download invoice PDF for an order item.
   * Backend: GET /order/invoice/:orderId/:itemId (returns PDF binary)
   * Triggers browser download; returns void.
   */
  downloadInvoice: async (orderId, itemId) => {
    const res = await client.get(`${BASE}/invoice/${orderId}/${itemId}`, {
      responseType: 'blob',
    });
    const blob = res.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${orderId}_${itemId || 'order'}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};
