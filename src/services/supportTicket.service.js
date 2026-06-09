import apiClient from './axiosClient.js'

const BASE = '/support/tickets'

function getApiErrorMessage(err, fallback = 'Request failed') {
  return err?.response?.data?.message ?? err?.message ?? fallback
}

function unwrap(res) {
  const body = res?.data
  if (body?.success === false) {
    throw new Error(body.message || 'Request failed')
  }
  return body?.data ?? body
}

export const supportTicketService = {
  async listOrderItems(params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/order-items`, { params })
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to load order items'))
    }
  },

  async raiseTicket(body) {
    try {
      const res = await apiClient.post(BASE, body)
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to create support ticket'))
    }
  },

  async listTickets(params = {}) {
    try {
      const res = await apiClient.get(BASE, { params })
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to load tickets'))
    }
  },

  async getTicket(id) {
    try {
      const res = await apiClient.get(`${BASE}/${id}`)
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to load ticket'))
    }
  },

  async getMessages(id, params = {}) {
    try {
      const res = await apiClient.get(`${BASE}/${id}/messages`, { params })
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to load messages'))
    }
  },

  async sendMessage(id, message) {
    try {
      const res = await apiClient.post(`${BASE}/${id}/messages`, { message })
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to send message'))
    }
  },

  async closeTicket(id) {
    try {
      const res = await apiClient.post(`${BASE}/${id}/close`)
      return unwrap(res)
    } catch (err) {
      throw new Error(getApiErrorMessage(err, 'Failed to close ticket'))
    }
  },
}
