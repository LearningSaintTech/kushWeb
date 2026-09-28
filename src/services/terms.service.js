import client from './axiosClient.js';

export const termsService = {
  /**
   * Get terms and conditions with pagination.
   * Endpoint: GET /terms-and-conditions/getAll?page=1&limit=20
   */
  getAll: (params = { page: 1, limit: 20 }) =>
    client.get('/terms-and-conditions/getAll', { params }),
};
