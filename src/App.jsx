import Routes from './app/routes'
import { AuthProvider } from './app/context/AuthContext'
import { CartWishlistProvider } from './app/context/CartWishlistContext'
import { useLocationOnLoad } from './app/hooks/useLocationOnLoad'

function AppContent() {
  useLocationOnLoad()
  return (
    <AuthProvider>
      <CartWishlistProvider>
        <Routes />
      </CartWishlistProvider>
    </AuthProvider>
  )
}

function App() {
  return <AppContent />
}

export default App
