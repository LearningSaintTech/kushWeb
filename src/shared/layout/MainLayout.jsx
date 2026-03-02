import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import AuthModal from '../../features/auth/AuthModal'

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden max-w-full">
      <ScrollToTop />
      <Header />
      <main className="flex-1 ">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
    </div>
  )
}

export default MainLayout

