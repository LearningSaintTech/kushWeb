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
   * Open invoice PDF for an order item.
   * Backend: GET /order/invoice/:orderId/:itemId — returns JSON with `invoice_url` (S3 PDF link).
   */
  downloadInvoice: async (orderId, itemId) => {
    const res = await client.get(`${BASE}/invoice/${orderId}/${itemId}`);
    const payload = res.data?.data ?? res.data;
    const invoiceUrl =
      (typeof payload?.invoice_url === 'string' && payload.invoice_url.trim()) ||
      (typeof payload?.invoiceUrl === 'string' && payload.invoiceUrl.trim()) ||
      null;
    const created = payload?.is_invoice_created ?? payload?.isInvoiceCreated;
    if (created === false || !invoiceUrl) {
      const message =
        (typeof payload?.message === 'string' && payload.message.trim()) ||
        'Invoice is not available yet.';
      const err = new Error(message);
      err.response = { data: { message } };
      throw err;
    }
    window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  },
};
