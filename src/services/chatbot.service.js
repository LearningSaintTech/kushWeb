/**
 * LEGACY AI CHATBOT API — disabled.
 * The storefront now uses live support tickets via supportTicket.service.js
 *
 * import client from './axiosClient.js'
 * const CHATBOT_BASE = '/chatbot'
 * export const chatbotService = {
 *   sendMessage: (body) => client.post(`${CHATBOT_BASE}/message`, body),
 * }
 */

export const chatbotService = {
  sendMessage: () => {
    throw new Error('AI chatbot is disabled. Use supportTicketService instead.')
  },
}
