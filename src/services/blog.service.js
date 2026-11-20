/**
 * Blog / Fashion Stories API (public read).
 * Base path: /blog
 */
import apiClient from './axiosClient.js'

function unwrap(res) {
  const body = res?.data
  if (body?.success === false) {
    throw new Error(body.message || 'Request failed')
  }
  return body?.data ?? body ?? {}
}

function toError(err, fallback) {
  const error = new Error(err?.response?.data?.message ?? err?.message ?? fallback)
  error.response = err?.response
  return error
}

export const blogService = {
  /** GET /blog/getAll — { posts, pagination, isEnabled } */
  async getAll(params = {}) {
    try {
      const data = unwrap(await apiClient.get('/blog/getAll', { params }))
      return {
        posts: Array.isArray(data?.posts) ? data.posts : [],
        pagination: data?.pagination ?? null,
        isEnabled: data?.isEnabled !== false,
      }
    } catch (err) {
      throw toError(err, 'Failed to load stories')
    }
  },

  /** GET /blog/slug/:slug */
  async getBySlug(slug) {
    try {
      return unwrap(await apiClient.get(`/blog/slug/${encodeURIComponent(slug)}`))
    } catch (err) {
      throw toError(err, 'Failed to load story')
    }
  },

  /** GET /blog/faq/blog/:blogId — returns [] when unavailable */
  async getFaqs(blogId) {
    try {
      const data = unwrap(await apiClient.get(`/blog/faq/blog/${blogId}`))
      if (Array.isArray(data)) return data
      return Array.isArray(data?.faqs) ? data.faqs : []
    } catch {
      return []
    }
  },

  /** GET /blog/:blogId/comments — { comments, pagination } */
  async getComments(blogId, params = { page: 1, limit: 20 }) {
    try {
      const data = unwrap(await apiClient.get(`/blog/${blogId}/comments`, { params }))
      return {
        comments: Array.isArray(data?.comments) ? data.comments : [],
        pagination: data?.pagination ?? null,
      }
    } catch {
      return { comments: [], pagination: null }
    }
  },
}
