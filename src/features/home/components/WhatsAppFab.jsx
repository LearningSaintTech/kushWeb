import { FaWhatsapp } from 'react-icons/fa'

const RAW_WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER || '').replace(/\D/g, '')
// wa.me needs the country code; a bare 10-digit number is an Indian mobile.
const WHATSAPP_NUMBER = RAW_WHATSAPP_NUMBER.length === 10 ? `91${RAW_WHATSAPP_NUMBER}` : RAW_WHATSAPP_NUMBER
const SUPPORT_MESSAGE = 'Hi Khush, I need help with my order.'

export default function WhatsAppFab() {
  if (!WHATSAPP_NUMBER) return null

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:h-[50px] sm:w-[50px]"
      aria-label="Chat with us on WhatsApp"
    >
      <FaWhatsapp className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
    </a>
  )
}
