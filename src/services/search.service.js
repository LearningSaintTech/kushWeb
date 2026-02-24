/**
 * Search keywords API – track, recent, popular, clear recent.
 * Base path: /search-keywords
 */

import client from './axiosClient.js';

const BASE = '/search-keywords';

export const searchKeywordsService = {
  track: (body) => client.post(`${BASE}/track`, body),

  /** GET recent searches (auth required). Params: limit */
  getRecent: (params) => client.get(`${BASE}/recent`, { params }),

  /** GET popular searches. Params: limit, timeRange (all|day|week|month) */
  getPopular: (params) => client.get(`${BASE}/popular`, { params }),

  clearRecent: () => client.delete(`${BASE}/recent`),

  deleteKeyword: (keyword) => client.delete(`${BASE}/${encodeURIComponent(keyword)}`),
};
