/**
 * Order API – create, verify-payment, order items.
 * Base path: /order
 * Requires: user auth (except webhook – server-only)
 */

import client from './axiosClient.js';

const BASE = '/order';

async function parseBlobErrorMessage(blob) {
  try {
    const text = await blob.text();
    const payload = JSON.parse(text);
    return payload?.message || 'Failed to download invoice';
  } catch {
    return 'Failed to download invoice';
  }
}

function triggerPdfDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
   * Backend: GET /order/invoice/:orderId/:itemId — returns PDF binary.
   */
  downloadInvoice: async (orderId, itemId) => {
    const path = itemId
      ? `${BASE}/invoice/${orderId}/${itemId}`
      : `${BASE}/invoice/${orderId}`;

    try {
      const res = await client.get(path, { responseType: 'blob' });
      const blob = res.data;
      const contentType = String(res.headers['content-type'] || '');

      if (!contentType.includes('application/pdf')) {
        const message = await parseBlobErrorMessage(blob);
        const err = new Error(message);
        err.response = { data: { message } };
        throw err;
      }

      const disposition = String(res.headers['content-disposition'] || '');
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
      const filename =
        filenameMatch?.[1]?.trim() ||
        `invoice_${orderId}${itemId ? `_${itemId}` : ''}.pdf`;

      triggerPdfDownload(blob, filename);
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const message = await parseBlobErrorMessage(error.response.data);
        const err = new Error(message);
        err.response = { data: { message } };
        throw err;
      }
      throw error;
    }
  },
};
