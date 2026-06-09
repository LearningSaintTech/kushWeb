/**
 * Floating support chat (replaces legacy AI chatbot modal).
 * Legacy AI implementation: see ./legacy/ChatbotModal.ai.jsx
 */
import SupportChat from './SupportChat'

export default function ChatbotModal({ open, onClose, initialContext = null }) {
  return (
    <SupportChat variant="modal" open={open} onClose={onClose} initialContext={initialContext} />
  )
}
