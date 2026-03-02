/**
 * Content API – banners, featured images, sections (for home/landing).
 * Base paths: /banner, /featuredImages, /sections
 */

import client from './axiosClient.js';

export const bannerService = {
  getAll: () => client.get('/banner/getAll'),

  getById: (bannerId) => client.get(`/banner/getSingle/${bannerId}`),
};

export const featuredImagesService = {
  get: (params) => client.get('/featuredImages/get', { params }),

  getAll: (params) => client.get('/featuredImages/get-all', { params }),
};

export const sectionsService = {
  getActive: (params) => client.get('/sections/get', { params }),

  getAll: (params) => client.get('/sections/getAll', { params }),

  getSingle: (sectionId) => client.get(`/sections/getSingle/${sectionId}`),

  /** Public: get one section by id (no auth). Use for search page section-scoped filters. */
  getOne: (sectionId) => client.get(`/sections/getOne/${sectionId}`),
};
