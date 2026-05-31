import apiClient from './axiosClient.js'

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? {}
}

function getApiErrorMessage(err, fallback = 'Failed to load FAQs') {
  return err?.response?.data?.message ?? err?.message ?? fallback
}

export const faqService = {
  /**
   * Public FAQs — GET /faq/getAll
   * @param {{ page?: number, limit?: number, topic?: string, search?: string }} params
   */
  async getAll(params = {}) {
    try {
      const res = await apiClient.get('/faq/getAll', { params })
      const body = res?.data
      if (body?.success === false) {
        throw new Error(body.message || 'Request failed')
      }
      const data = unwrap(res)
      const faqs = Array.isArray(data?.faqs) ? data.faqs : []
      return {
        faqs,
        pagination: data?.pagination ?? null,
      }
    } catch (err) {
      const message = getApiErrorMessage(err)
      const error = new Error(message)
      error.response = err.response
      throw error
    }
  },

  /** GET /faq/getSingle/:id */
  async getById(id) {
    try {
      const res = await apiClient.get(`/faq/getSingle/${id}`)
      const body = res?.data
      if (body?.success === false) {
        throw new Error(body.message || 'Request failed')
      }
      return unwrap(res)
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to load FAQ')
      const error = new Error(message)
      error.response = err.response
      throw error
    }
  },
}

export { getApiErrorMessage as faqApiMessage }
