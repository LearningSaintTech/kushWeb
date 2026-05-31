import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'
import { trackPageView } from '../../analytics'
import ChatbotModal from '../../features/chatbot/ChatbotModal'
import chatFabImage from '../../assets/images/chat-fab.svg'

function MainLayout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    trackPageView({
      path: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search]);

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
        className="fixed bottom-5 right-4 z-40 rounded-full p-0 shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:bottom-6 sm:right-6"
        aria-label="Open shopping assistant"
      >
        <img
          src={chatFabImage}
          alt=""
          width={70}
          height={70}
          className="h-[62px] w-[62px] sm:h-[74px] sm:w-[74px]"
          draggable={false}
        />
      </button>
      <ChatbotModal open={chatOpen} onClose={() => setChatOpen(false)} />
      <Footer />
      <AuthModal />
    </div>
  );
}

export default MainLayout;
