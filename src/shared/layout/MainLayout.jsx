import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'

function MainLayout() {
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

