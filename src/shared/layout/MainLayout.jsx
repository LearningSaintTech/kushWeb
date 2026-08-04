import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import MadeInIndiaMarquee from '../components/MadeInIndiaMarquee'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'
import { trackPageView, trackPixelPageView } from '../../analytics'
import { useSupportChat } from '../../app/context/SupportChatContext'
import chatFabImage from '../../assets/images/chat-fab.svg'
import WhatsAppFab from '../../features/home/components/WhatsAppFab.jsx'

function MainLayout() {
  const location = useLocation();
  const { openSupportChat } = useSupportChat();
  const isCommunityFeed = location.pathname.startsWith('/community/feed');

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    trackPageView({ path });
    trackPixelPageView(path);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden  max-w-full">
      <ScrollToTop />
      {!isCommunityFeed ? <Header /> : null}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isCommunityFeed ? (
        <>
          <div className="fixed bottom-5 right-4 z-40 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6">
            <button
              type="button"
              onClick={() => openSupportChat()}
              className="rounded-full p-0 shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              aria-label="Open support chat"
            >
              <img
                src={chatFabImage}
                alt=""
                width={70}
                height={70}
                className="h-[40px] w-[40px] sm:h-[50px] sm:w-[50px]"
                draggable={false}
              />
            </button>
            <WhatsAppFab />
          </div>
          <MadeInIndiaMarquee />
          <Footer />
        </>
      ) : null}
      <AuthModal />
    </div>
  );
}

export default MainLayout;
