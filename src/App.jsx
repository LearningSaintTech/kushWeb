import Routes from './app/routes'
import { AuthProvider, useAuth } from './app/context/AuthContext'
import { CartWishlistProvider } from './app/context/CartWishlistContext'
import { NotificationProvider, useNotificationSocket } from './app/context/NotificationContext'
import { SupportChatProvider } from './app/context/SupportChatContext'
import { usePushSubscribe } from './app/hooks/usePushSubscribe'
import { useLocationOnLoad } from './app/hooks/useLocationOnLoad'
import { useEffect, useRef } from 'react'
import { trackSessionEnd, trackSessionStart } from './analytics'
//sdfgh
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

function AnalyticsSessionConnector() {
  const { isAuthenticated } = useAuth()
  const sentRef = useRef(false)
  const sessionEndSentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true
    trackSessionStart({ isAuthenticated })
  }, [isAuthenticated])

  useEffect(() => {
    const sendSessionEnd = () => {
      if (sessionEndSentRef.current) return
      sessionEndSentRef.current = true
      trackSessionEnd({ isAuthenticated })
    }

    const onBeforeUnload = () => {
      sendSessionEnd()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendSessionEnd()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated])

  return null
}
//cdcf
function AppContent() {
  return (
    <AuthProvider>
      <CartWishlistProvider>
        <NotificationProvider>
          <SupportChatProvider>
            <AnalyticsSessionConnector />
            <LocationOnLoadConnector />
            <NotificationSocketConnector />
            <PushSubscribeConnector />
            <Routes />
          </SupportChatProvider>
        </NotificationProvider>
      </CartWishlistProvider>
    </AuthProvider>
  )
}

function App() {
  return <AppContent />
}

export default App
