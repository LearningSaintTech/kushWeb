import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'
import { trackPageView, trackRouteChange } from '../../analytics'

function MainLayout() {
  const location = useLocation()
  const previousPathRef = useRef('')

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`
    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      trackRouteChange({
        path: currentPath,
        meta: {
          from: previousPathRef.current,
          to: currentPath,
        },
      })
    }
    trackPageView({ path: currentPath })
    previousPathRef.current = currentPath
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

