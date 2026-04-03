/**
 * Exchange API – create exchange request.
 * Backend: POST /api/exchangeUser/create
 * multipart fields include: orderId, itemId, quantityToExchange, reason, images, replacedItem
 */

import client from './axiosClient.js';

const BASE = '/exchangeUser';

export const exchangeService = {
  /**
   * Create exchange request.
   * @param {{ orderId: string, itemId: string, quantityToExchange: number, reason: string, desiredSize?: string, desiredColor?: string, replacedItem?: object }} fields
   * @param {File[]} imageFiles - 3 to 5 image files
   */
  createExchangeRequest: (fields, imageFiles = []) => {
    const form = new FormData()
    form.append('orderId', fields.orderId)
    form.append('itemId', fields.itemId)
    form.append('quantityToExchange', String(fields.quantityToExchange))
    form.append('reason', fields.reason)
    if (fields.desiredSize != null && String(fields.desiredSize).trim()) {
      form.append('desiredSize', String(fields.desiredSize).trim())
    }
   
    if (fields.desiredColor != null && String(fields.desiredColor).trim()) {
      form.append('desiredColor', String(fields.desiredColor).trim())
    }
    if (fields.replacedItem) {
      form.append('replacedItem', JSON.stringify(fields.replacedItem))
    }
    if (Array.isArray(imageFiles)) {
      imageFiles.forEach((file) => form.append('images', file))
    }
    return client.post(`${BASE}/create`, form)
  },
}
