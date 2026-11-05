/**
 * Blog API. Reads are public; likes and comments need a logged-in customer.
 * Base path: /blog
 */
import client from './axiosClient.js'

const BASE = '/blog'
const unwrap = (res) => res?.data?.data ?? res?.data ?? {}

export const blogService = {
  /** @param {{ page?: number, limit?: number, categorySlug?: string, search?: string }} params */
  async getPosts(params = {}) {
    const data = unwrap(await client.get(`${BASE}/getAll`, { params }))
    return {
      posts: Array.isArray(data.posts) ? data.posts : [],
      pagination: data.pagination ?? null,
      isEnabled: data.isEnabled !== false,
    }
  },

  async getCategories() {
    const data = unwrap(await client.get(`${BASE}/categories/getAll`))
    return Array.isArray(data.categories) ? data.categories : []
  },

  async getPost(slug) {
    return unwrap(await client.get(`${BASE}/slug/${encodeURIComponent(slug)}`))
  },

  async getRelated(slug, limit = 3) {
    const data = unwrap(await client.get(`${BASE}/related/${encodeURIComponent(slug)}`, { params: { limit } }))
    return Array.isArray(data.posts) ? data.posts : Array.isArray(data) ? data : []
  },

  recordView: (slug) => client.post(`${BASE}/slug/${encodeURIComponent(slug)}/view`),

  async toggleLike(blogId) {
    return unwrap(await client.post(`${BASE}/${blogId}/like`))
  },

  async getComments(blogId, params = {}) {
    const data = unwrap(await client.get(`${BASE}/${blogId}/comments`, { params }))
    return {
      comments: Array.isArray(data.comments) ? data.comments : [],
      pagination: data.pagination ?? null,
    }
  },

  async addComment(blogId, { text, parentId }) {
    return unwrap(await client.post(`${BASE}/${blogId}/comments`, { text, ...(parentId ? { parentId } : {}) }))
  },

  async toggleCommentLike(commentId) {
    return unwrap(await client.post(`${BASE}/comments/${commentId}/like`))
  },

  deleteComment: (commentId) => client.delete(`${BASE}/comments/${commentId}`),
}
