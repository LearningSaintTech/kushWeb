import Routes from './app/routes'
import { AuthProvider, useAuth } from './app/context/AuthContext'
import { CartWishlistProvider } from './app/context/CartWishlistContext'
import { NotificationProvider, useNotificationSocket } from './app/context/NotificationContext'
import { usePushSubscribe } from './app/hooks/usePushSubscribe'
import { useLocationOnLoad } from './app/hooks/useLocationOnLoad'

function NotificationSocketConnector() {
  const { token } = useAuth()
  useNotificationSocket(token)
  return null
}

function PushSubscribeConnector() {
  const { token } = useAuth()
  usePushSubscribe(token)
  return null
}

function LocationOnLoadConnector() {
  const { isAuthenticated } = useAuth()
  useLocationOnLoad(isAuthenticated)
  return null
}

function AppContent() {
  return (
    <AuthProvider>
      <CartWishlistProvider>
        <NotificationProvider>
          <LocationOnLoadConnector />
          <NotificationSocketConnector />
          <PushSubscribeConnector />
          <Routes />
        </NotificationProvider>
      </CartWishlistProvider>
    </AuthProvider>
  )
}

function App() {
  return <AppContent />
}

export default App
