/**
 * Items API – search and get single item.
 * Search: GET /items/search (keyword, categoryId, subcategoryId, minPrice, maxPrice, filters, pinCode, page, limit)
 */

import client from './axiosClient.js';

const ITEMS = '/items';

/**
 * Search items with filters (matches KhushBackend Search API).
 * @param {Object} params
 * @param {string} [params.keyword] - Search in name, shortDescription, longDescription
 * @param {string} [params.categoryId] - Filter by category ID
 * @param {string} [params.subcategoryId] - Filter by subcategory ID
 * @param {number} [params.minPrice] - Minimum price
 * @param {number} [params.maxPrice] - Maximum price
 * @param {string|Object} [params.filters] - JSON string or object e.g. {"color":["red","blue"],"size":["M","L"]}
 * @param {string} [params.pinCode] - For delivery type / availability
 * @param {string} [params.itemIds] - Comma-separated item IDs (section explore)
 * @param {string} [params.sectionId] - Section ID; backend resolves to itemIds (section explore)
 * @param {number} [params.page=1]
 * @param {number} [params.limit=12]
 */
export function search(params = {}) {
  const { filters, ...rest } = params;
  const query = { ...rest };
  if (filters != null) {
    query.filters = typeof filters === 'string' ? filters : JSON.stringify(filters);
  }
  return client.get(`${ITEMS}/search`, { params: query });
}

/**
 * Get a single item by ID.
 * @param {string} itemId - Item _id
 * @param {Object} [params] - Optional query params (e.g. pincode for delivery/availability)
 */
export function getById(itemId, params = {}) {
  return client.get(`${ITEMS}/single/${itemId}`, { params });
}

/**
 * Get all items in random order (v2 endpoint).
 * @param {Object} [params]
 * @param {boolean|string} [params.isActive=true]
 */
export function getAllVersion2(params = {}) {
  return client.get(`${ITEMS}/getAllVersion2`, { params });
}

export const itemsService = {
  search,
  getById,
  getAllVersion2,
};
