import publicClient from './publicApiClient.js'

const BASE = '/gift-items'

export const giftItemsService = {
  getActive: async () => {
    const response = await publicClient.get(`${BASE}/getActive`)
    const items = response?.data?.data ?? response?.data ?? []
    return Array.isArray(items) ? items : []
  },
}
