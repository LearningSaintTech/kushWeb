/**
 * Categories and subcategories API.
 * Base paths: /categories, /subcategories
 */

import client from './axiosClient.js';

const CATEGORIES = '/categories';
const SUBCATEGORIES = '/subcategories';

export const categoriesService = {
  getAll: (params) => client.get(`${CATEGORIES}/getAll`, { params }),

  getById: (id) => client.get(`${CATEGORIES}/getbyId/${id}`),

  /** Categories with isNavbar=true for header menu (only active in navbar). */
  getNavbar: (params = {}) =>
    client.get(`${CATEGORIES}/getAll`, { params: { isNavbar: 'true', limit: 50, ...params } }),

  /** Categories with isFooter=true for footer menu. */
  getFooter: (params = {}) =>
    client.get(`${CATEGORIES}/getAll`, { params: { isFooter: 'true', limit: 50, ...params } }),
};

export const subcategoriesService = {
  getAll: (params) => client.get(`${SUBCATEGORIES}/getAll`, { params }),

  getByCategoryId: (categoryId, params) =>
    client.get(`${SUBCATEGORIES}/getAll/${categoryId}`, { params }),

  getById: (id) => client.get(`${SUBCATEGORIES}/getbyId/${id}`),

  /** Subcategories with isNavbar=true for a category (header menu). */
  getNavbarByCategoryId: (categoryId) =>
    client.get(`${SUBCATEGORIES}/getAll/${categoryId}`, { params: { isNavbar: 'true', limit: 50 } }),

  /** Subcategories with isFooter=true for a category (footer menu). */
  getFooterByCategoryId: (categoryId, params = {}) =>
    client.get(`${SUBCATEGORIES}/getAll/${categoryId}`, { params: { isFooter: 'true', limit: 50, ...params } }),
};
