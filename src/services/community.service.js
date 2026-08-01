/**
 * Community content / social API — feed, posts, reels, follow, like, comments, saves.
 * Base path: /community  (gateway → community service)
 * Auth: Bearer via axiosClient
 *
 * See Downloads/FRONTEND_INTEGRATION.md for contract.
 * Dev logs: [Community] via communityApi.js
 */

import client from './axiosClient.js';
import {
  COMMUNITY_BASE,
  wrapCommunity,
  getCommunityErrorMessage,
  isDesignerNotVerifiedError,
  logCommunity,
} from './communityApi.js';

const BASE = COMMUNITY_BASE;

function qs(params = {}) {
  const cleaned = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    cleaned[k] = v;
  });
  return cleaned;
}

export const communityService = {
  // ——— Product picker ———

  /** GET /community/purchased-items */
  getPurchasedItems: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/purchased-items`,
      client.get(`${BASE}/purchased-items`, { params: qs({ limit: 100, ...params }) }),
      params,
    ),

  // ——— Uploads (low-level; prefer communityUpload.service for full flow) ———

  /** POST /community/uploads/presign */
  presignUpload: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/uploads/presign`,
      client.post(`${BASE}/uploads/presign`, body),
      body,
    ),

  /** POST /community/uploads/multipart/sign-part */
  signMultipartPart: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/uploads/multipart/sign-part`,
      client.post(`${BASE}/uploads/multipart/sign-part`, body),
      body,
    ),

  /** POST /community/uploads/multipart/complete */
  completeMultipart: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/uploads/multipart/complete`,
      client.post(`${BASE}/uploads/multipart/complete`, body),
      body,
    ),

  /** POST /community/uploads/multipart/abort */
  abortMultipart: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/uploads/multipart/abort`,
      client.post(`${BASE}/uploads/multipart/abort`, body),
      body,
    ),

  // ——— Publish ———

  /** POST /community/posts/publish — expects 202 processing */
  publishPost: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/posts/publish`,
      client.post(`${BASE}/posts/publish`, body),
      body,
    ),

  /** POST /community/reels/publish */
  publishReel: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/reels/publish`,
      client.post(`${BASE}/reels/publish`, body),
      body,
    ),

  // ——— Content ———

  /** GET /community/content/:id */
  getContent: (id) =>
    wrapCommunity('GET', `${BASE}/content/${id}`, client.get(`${BASE}/content/${id}`)),

  /** POST /community/content/:id/view */
  recordView: (id) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${id}/view`,
      client.post(`${BASE}/content/${id}/view`),
    ),

  /** PATCH /community/posts/:id — caption only */
  updatePostCaption: (id, caption) =>
    wrapCommunity(
      'PATCH',
      `${BASE}/posts/${id}`,
      client.patch(`${BASE}/posts/${id}`, { caption }),
      { caption },
    ),

  /** DELETE /community/content/:id */
  deleteContent: (id) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/content/${id}`,
      client.delete(`${BASE}/content/${id}`),
    ),

  // ——— Feed ———

  /**
   * GET /community/feed
   * @param {{ scope?: 'following'|'explore', type?: 'all'|'post'|'reel', q?: string, hashtag?: string, itemId?: string, limit?: number, cursor?: string }} params
   */
  getFeed: (params = {}) => {
    const query = qs({
      scope: params.scope ?? 'following',
      type: params.type ?? 'all',
      q: params.q ?? params.keyword ?? params.search,
      hashtag: params.hashtag,
      itemId: params.itemId,
      limit: params.limit ?? 20,
      cursor: params.cursor,
    });
    logCommunity('getFeed params', query);
    return wrapCommunity(
      'GET',
      `${BASE}/feed`,
      client.get(`${BASE}/feed`, { params: query }),
      query,
    );
  },

  /** GET /community/hashtags — keyword chips */
  getHashtags: () =>
    wrapCommunity('GET', `${BASE}/hashtags`, client.get(`${BASE}/hashtags`)),

  // ——— Follow ———

  follow: (userId) =>
    wrapCommunity(
      'POST',
      `${BASE}/follow/${userId}`,
      client.post(`${BASE}/follow/${userId}`),
    ),

  unfollow: (userId) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/follow/${userId}`,
      client.delete(`${BASE}/follow/${userId}`),
    ),

  // ——— Profile ———

  getMyProfile: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/profile/me`,
      client.get(`${BASE}/profile/me`, {
        params: qs({
          postsLimit: 12,
          reelsLimit: 12,
          productsLimit: 20,
          ...params,
        }),
      }),
      params,
    ),

  getProfile: (userId, params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/profile/${userId}`,
      client.get(`${BASE}/profile/${userId}`, {
        params: qs({
          postsLimit: 12,
          reelsLimit: 12,
          productsLimit: 20,
          ...params,
        }),
      }),
      { userId, ...params },
    ),

  getFollowers: (userId, params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/profile/${userId}/followers`,
      client.get(`${BASE}/profile/${userId}/followers`, {
        params: qs({ limit: 20, ...params }),
      }),
      { userId, ...params },
    ),

  getFollowing: (userId, params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/profile/${userId}/following`,
      client.get(`${BASE}/profile/${userId}/following`, {
        params: qs({ limit: 20, ...params }),
      }),
      { userId, ...params },
    ),

  // ——— Like ———

  like: (contentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/like`,
      client.post(`${BASE}/content/${contentId}/like`),
    ),

  unlike: (contentId) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/content/${contentId}/like`,
      client.delete(`${BASE}/content/${contentId}/like`),
    ),

  // ——— Comments ———

  addComment: (contentId, text) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/comments`,
      client.post(`${BASE}/content/${contentId}/comments`, { text }),
      { text },
    ),

  listComments: (contentId, params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/content/${contentId}/comments`,
      client.get(`${BASE}/content/${contentId}/comments`, {
        params: qs({ limit: 20, ...params }),
      }),
      { contentId, ...params },
    ),

  deleteComment: (commentId) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/comments/${commentId}`,
      client.delete(`${BASE}/comments/${commentId}`),
    ),

  // ——— Saves ———

  save: (contentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/save`,
      client.post(`${BASE}/content/${contentId}/save`),
    ),

  unsave: (contentId) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/content/${contentId}/save`,
      client.delete(`${BASE}/content/${contentId}/save`),
    ),

  /**
   * GET /community/saves
   * @param {{ type?: 'all'|'post'|'reel', limit?: number, cursor?: string }} params
   */
  getSaves: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/saves`,
      client.get(`${BASE}/saves`, {
        params: qs({ type: params.type ?? 'all', limit: 20, ...params }),
      }),
      params,
    ),
};

export { getCommunityErrorMessage, isDesignerNotVerifiedError };
