import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'
import { trackPageView } from '../../analytics'

function MainLayout() {
  const location = useLocation()

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
      <Footer />
      <AuthModal />
    </div>
  )
}

export default MainLayout

