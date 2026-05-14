import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import AuthModal from "../../features/auth/AuthModal";
import { trackPageView } from "../../analytics";
import ChatbotModal from "../../features/chatbot/ChatbotModal";
import assistantLogo from "../../assets/temporary/khush bot.png";

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
        className="fixed bottom-5 right-4 z-40 rounded-full shadow-lg transition hover:scale-105 sm:bottom-6 sm:right-6"
        aria-label="Open shopping assistant"
      >
        <img
          src={assistantLogo}
          alt="Assistant"
          className="h-14 w-14 rounded-full object-cover  shadow-lg"
        />
      </button>
      <ChatbotModal open={chatOpen} onClose={() => setChatOpen(false)} />
      <Footer />
      <AuthModal />
    </div>
  );
}

export default MainLayout;
