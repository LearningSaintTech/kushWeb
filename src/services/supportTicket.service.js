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

function appendMediaToFormData(formData, { images = [], videos = [] } = {}) {
  images.slice(0, 5).forEach((file) => {
    if (file) formData.append('images', file)
  })
  videos.slice(0, 2).forEach((file) => {
    if (file) formData.append('videos', file)
  })
}

function buildTicketFormData(body = {}, media = {}) {
  const formData = new FormData()
  const fields = {
    subject: body.subject,
    description: body.description,
    issueType: body.issueType,
    priority: body.priority,
    orderId: body.orderId,
    itemId: body.itemId,
  }
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })
  appendMediaToFormData(formData, media)
  return formData
}

function normalizeSendPayload(payload) {
  if (typeof payload === 'string') {
    return { message: payload, images: [], videos: [] }
  }

  const message = payload?.message ?? ''
  let images = Array.isArray(payload?.images) ? payload.images : []
  let videos = Array.isArray(payload?.videos) ? payload.videos : []

  if (Array.isArray(payload?.files) && payload.files.length) {
    for (const file of payload.files) {
      if (!file) continue
      const type = (file.type || '').toLowerCase()
      if (type.startsWith('video/')) videos.push(file)
      else images.push(file)
    }
  }

  return { message, images, videos }
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

  /**
   * @param {object} body — ticket fields
   * @param {{ images?: File[], videos?: File[] }} [media]
   */
  async raiseTicket(body, media = {}) {
    const images = Array.isArray(media.images) ? media.images : []
    const videos = Array.isArray(media.videos) ? media.videos : []

    try {
      if (images.length || videos.length) {
        const formData = buildTicketFormData(body, { images, videos })
        const res = await apiClient.post(BASE, formData)
        return unwrap(res)
      }

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

  /**
   * @param {string} id
   * @param {string | { message?: string, images?: File[], videos?: File[], files?: File[] }} payload
   */
  async sendMessage(id, payload) {
    const { message, images, videos } = normalizeSendPayload(payload)

    try {
      if (images.length || videos.length) {
        const formData = new FormData()
        if (message.trim()) formData.append('message', message.trim())
        appendMediaToFormData(formData, { images, videos })
        const res = await apiClient.post(`${BASE}/${id}/messages`, formData)
        return unwrap(res)
      }

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
