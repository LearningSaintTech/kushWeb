/**
 * Filters API – get filters for search/listing.
 * GET /filters/all (isActive, page, limit, search, sortBy, sortOrder)
 */

import client from './axiosClient.js';

const FILTERS = '/filters';

/**
 * Get all filters (e.g. for search filter panel).
 * @param {Object} params
 * @param {string} [params.isActive='true'] - Only active filters
 * @param {string} [params.pinCode] - Chosen pincode (sent with every filter API call)
 * @param {number} [params.page=1]
 * @param {number} [params.limit=100]
 * @param {string} [params.search]
 * @param {string} [params.sortBy] - key, label, sortOrder, createdAt, updatedAt
 * @param {string} [params.sortOrder] - asc, desc
 */
export function getAll(params = {}) {
  return client.get(`${FILTERS}/all`, {
    params: { isActive: 'true', limit: 100, ...params },
  });
}

export const filtersService = {
  getAll,
};
