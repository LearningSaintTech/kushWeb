import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'
import { trackPageView } from '../../analytics'
import ChatbotModal from '../../features/chatbot/ChatbotModal'

function MainLayout() {
  const location = useLocation()
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    trackPageView({
      path: `${location.pathname}${location.search}`,
    })
  }, [location.pathname, location.search])

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gray-100 max-w-full">
      <ScrollToTop />
      <Header />
      <main className="flex-1 bg-gray-100">
        <Outlet />
      </main>
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-xs font-semibold text-white shadow-lg transition hover:bg-zinc-800 sm:bottom-6 sm:right-6 sm:text-sm"
        aria-label="Open shopping assistant"
      >
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
        Ask Khush
      </button>
      <ChatbotModal open={chatOpen} onClose={() => setChatOpen(false)} />
      <Footer />
      <AuthModal />
    </div>
  )
}

export default MainLayout

