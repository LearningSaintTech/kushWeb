import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ChatbotModal from '../../features/chatbot/ChatbotModal'

const SupportChatContext = createContext(null)

/**
 * @typedef {object} SupportChatContextPayload
 * @property {string} [orderId] - Order mongo id or human order code (ORD-…)
 * @property {string} [itemId] - Catalog line item id
 * @property {string} [orderCode] - Display order number
 * @property {string} [productName]
 * @property {string} [issueType]
 * @property {string} [subject]
 * @property {string} [description]
 */

export function SupportChatProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState(null)

  const openSupportChat = useCallback((payload = null) => {
    setContext(payload)
    setOpen(true)
  }, [])

  const closeSupportChat = useCallback(() => {
    setOpen(false)
    setContext(null)
  }, [])

  const value = useMemo(
    () => ({ open, context, openSupportChat, closeSupportChat }),
    [open, context, openSupportChat, closeSupportChat],
  )

  return (
    <SupportChatContext.Provider value={value}>
      {children}
      <ChatbotModal open={open} onClose={closeSupportChat} initialContext={context} />
    </SupportChatContext.Provider>
  )
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext)
  if (!ctx) {
    throw new Error('useSupportChat must be used within SupportChatProvider')
  }
  return ctx
}
