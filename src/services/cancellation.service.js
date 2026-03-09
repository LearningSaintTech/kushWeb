/**
 * Cancellation API – cancel order item.
 * Backend: POST /api/cancel-order
 */

import client from './axiosClient.js';

const BASE = '/cancel-order';

export const cancellationService = {
  /**
   * Cancel an order item.
   * @param {{ orderId: string, itemId: string, reason: string, couponIssued?: boolean }} body
   */
  cancelOrderItem: (body) => client.post(BASE, body),
};
