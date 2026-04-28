import client from './axiosClient.js'

const CHATBOT_BASE = '/chatbot'

export const chatbotService = {
  sendMessage: (body) => client.post(`${CHATBOT_BASE}/message`, body),
}

