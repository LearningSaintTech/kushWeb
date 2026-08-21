/**
 * Community content / social API — feed, posts, reels, follow, like, comments, saves.
 * Base path: /community  (gateway → community service)
 * Auth: Bearer via axiosClient
 *
 * See docs/FRONTEND_INTEGRATION.md for contract.
 * Mappers: communityContent.mappers.js (re-exported below).
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

  /**
   * GET /community/purchased-items
   * Product picker while creating a post/reel.
   * @param {{ q?: string, page?: number, limit?: number, cursor?: string }} [params]
   */
  getPurchasedItems: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/purchased-items`,
      client.get(`${BASE}/purchased-items`, {
        params: qs({
          limit: params.limit ?? 10,
          page: params.page,
          q: params.q,
          cursor: params.cursor,
          ...params,
        }),
      }),
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

  /**
   * GET /community/content/:id
   * Full content detail (media, caption, tagged products / items).
   * @param {string} id
   * @param {{ taggedLimit?: number, taggedPage?: number, taggedCursor?: string }} [params]
   */
  getContent: (id, params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/content/${id}`,
      client.get(`${BASE}/content/${id}`, {
        params: qs({
          taggedLimit: params.taggedLimit ?? params.limit,
          taggedPage: params.taggedPage ?? params.page,
          taggedCursor: params.taggedCursor ?? params.cursor,
          ...params,
        }),
      }),
      { id, ...params },
    ),

  /**
   * GET /community/stats
   * Aggregated metrics for the signed-in creator/designer:
   * totalLikes, totalViews, totalContent / totalPosts
   */
  getStats: () =>
    wrapCommunity('GET', `${BASE}/stats`, client.get(`${BASE}/stats`)),

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

  // ——— Block / Unblock ———

  /** POST /community/block/:userId */
  blockUser: (userId) =>
    wrapCommunity(
      'POST',
      `${BASE}/block/${userId}`,
      client.post(`${BASE}/block/${userId}`),
    ),

  /** POST /community/unblock/:userId */
  unblockUser: (userId) =>
    wrapCommunity(
      'POST',
      `${BASE}/unblock/${userId}`,
      client.post(`${BASE}/unblock/${userId}`),
    ),

  /**
   * GET /community/block
   * @param {{ cursor?: string, limit?: number }} [params]
   */
  listBlockedUsers: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/block`,
      client.get(`${BASE}/block`, {
        params: qs({ limit: params.limit ?? 20, cursor: params.cursor }),
      }),
      params,
    ),

  /** POST /community/content/:contentId/block */
  blockContentAuthor: (contentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/block`,
      client.post(`${BASE}/content/${contentId}/block`),
    ),

  /** POST /community/content/:contentId/unblock */
  unblockContentAuthor: (contentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/unblock`,
      client.post(`${BASE}/content/${contentId}/unblock`),
    ),

  /** POST /community/comments/:commentId/block */
  blockCommentAuthor: (commentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/comments/${commentId}/block`,
      client.post(`${BASE}/comments/${commentId}/block`),
    ),

  /** POST /community/comments/:commentId/unblock */
  unblockCommentAuthor: (commentId) =>
    wrapCommunity(
      'POST',
      `${BASE}/comments/${commentId}/unblock`,
      client.post(`${BASE}/comments/${commentId}/unblock`),
    ),

  // ——— Report ———

  /**
   * POST /community/report
   * @param {{ targetType: string, targetId: string, reason: string, details?: string }} body
   */
  report: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/report`,
      client.post(`${BASE}/report`, body),
      body,
    ),

  /**
   * POST /community/content/:contentId/report
   * @param {string} contentId
   * @param {{ reason: string, details?: string }} body
   */
  reportContent: (contentId, body) =>
    wrapCommunity(
      'POST',
      `${BASE}/content/${contentId}/report`,
      client.post(`${BASE}/content/${contentId}/report`, body),
      body,
    ),

  /**
   * POST /community/comments/:commentId/report
   * @param {string} commentId
   * @param {{ reason: string, details?: string }} body
   */
  reportComment: (commentId, body) =>
    wrapCommunity(
      'POST',
      `${BASE}/comments/${commentId}/report`,
      client.post(`${BASE}/comments/${commentId}/report`, body),
      body,
    ),

  /**
   * GET /community/report/me
   * @param {{ cursor?: string, limit?: number }} [params]
   */
  listMyReports: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/report/me`,
      client.get(`${BASE}/report/me`, {
        params: qs({ limit: params.limit ?? 20, cursor: params.cursor }),
      }),
      params,
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

  // ——— Designer projects ———

  /**
   * GET /community/projects/categories
   * Admin catalog of active project categories.
   * @param {{ q?: string, limit?: number }} params
   */
  getProjectCategories: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/projects/categories`,
      client.get(`${BASE}/projects/categories`, {
        params: qs({
          q: params.q,
          limit: params.limit ?? 30,
        }),
      }),
      params,
    ),

  /** POST /community/projects */
  createProject: (body) =>
    wrapCommunity(
      'POST',
      `${BASE}/projects`,
      client.post(`${BASE}/projects`, body),
      body,
    ),

  /**
   * GET /community/projects/me
   * @param {{ status?: string, category?: string, limit?: number, cursor?: string }} params
   */
  getMyProjects: (params = {}) =>
    wrapCommunity(
      'GET',
      `${BASE}/projects/me`,
      client.get(`${BASE}/projects/me`, {
        params: qs({
          status: params.status ?? 'all',
          category: params.category ?? 'all',
          limit: params.limit ?? 20,
          cursor: params.cursor,
        }),
      }),
      params,
    ),

  /** GET /community/projects/me/:projectId */
  getMyProject: (projectId) =>
    wrapCommunity(
      'GET',
      `${BASE}/projects/me/${projectId}`,
      client.get(`${BASE}/projects/me/${projectId}`),
    ),

  /** PATCH /community/projects/me/:projectId */
  updateMyProject: (projectId, body) =>
    wrapCommunity(
      'PATCH',
      `${BASE}/projects/me/${projectId}`,
      client.patch(`${BASE}/projects/me/${projectId}`, body),
      body,
    ),

  /** DELETE /community/projects/me/:projectId */
  deleteMyProject: (projectId) =>
    wrapCommunity(
      'DELETE',
      `${BASE}/projects/me/${projectId}`,
      client.delete(`${BASE}/projects/me/${projectId}`),
    ),
};

export { getCommunityErrorMessage, isDesignerNotVerifiedError };
export {
  mapContentToPost,
  mapContentToReel,
  mapPurchasedItem,
  mapSaveItem,
  extractSavesList,
  extractHashtagsFromCaption,
  mapSocialProfile,
  mapComment,
  extractCommentsList,
  mapProject,
  extractProjectsList,
  unwrapProject,
  extractProjectCategoryNames,
} from './communityContent.mappers.js';
