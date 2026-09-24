import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { authService } from '../../services/auth.service.js'
import { setAccessTokenGetter, getCurrentAccessToken, setOnAuthRequired } from '../../services/axiosClient.js'
import { getMemoryToken, setMemoryToken, subscribeMemoryToken, hydrateMemoryTokenFromSession } from '../../utils/tokenMemory.js'
import { getValidAccessToken, isTokenExpired } from '../../utils/authToken.js'
import { refreshUserAccessToken, rememberRefreshTokenFromAuthPayload } from '../../utils/authSession.js'
import { performLogout, clearLegacyAuthStorage } from '../../utils/sessionLogout.js'
import { hasSessionHint, setSessionHint } from '../../utils/sessionHint.js'
import { getStoredRefreshToken, setStoredRefreshToken } from '../../utils/refreshTokenStore.js'
import { getOrCreateDeviceId } from '../../utils/deviceId.js'
import {
  buildMinimalUser,
  extractAuthUser,
  fetchUserProfileWithRetry,
  isProfileNotFoundError,
  unwrapApiData,
} from '../../utils/authProfile.js'
import AuthSuccessToast from '../../shared/components/AuthSuccessToast.jsx'
import { trackEvent } from '../../analytics'

/** Persist context across Vite HMR so Provider/consumer stay in sync after hot updates. */
const AuthContext = import.meta.hot?.data?.AuthContext ?? createContext(null)
if (import.meta.hot) {
  import.meta.hot.data.AuthContext = AuthContext
}

/** Routes where guests can browse freely — never force the login modal from 401s. */
function isPublicBrowsePath(pathname = '') {
  // Address / account / orders / community / giftcard need login when session dies.
  // Keep storefront browse public.
  const path = String(pathname || '')
  if (path === '/' || path === '') return true
  return (
    path.startsWith('/search') ||
    path.startsWith('/product') ||
    path.startsWith('/section') ||
    path.startsWith('/shaktiman') ||
    path.startsWith('/cart') ||
    path.startsWith('/wishlist') ||
    path.startsWith('/collections') ||
    path.startsWith('/about-us') ||
    path.startsWith('/contact-us') ||
    path.startsWith('/faqs') ||
    path.startsWith('/privacy-policy') ||
    path.startsWith('/terms-conditions') ||
    path.startsWith('/refund-cancel-policy') ||
    path.startsWith('/return-policy') ||
    path.startsWith('/shipping-delivery-policy') ||
    path.startsWith('/payment-policy') ||
    path.startsWith('/delete-account')
  )
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => hydrateMemoryTokenFromSession() || getMemoryToken())
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalRedirectTo, setAuthModalRedirectTo] = useState(null)
  const [profilePanelRequest, setProfilePanelRequest] = useState(0)
  const [authSuccessMessage, setAuthSuccessMessage] = useState(null)

  const clearAuthSuccessMessage = useCallback(() => {
    setAuthSuccessMessage(null)
  }, [])

  const showAuthSuccessMessage = useCallback((message) => {
    if (!message) return
    setAuthSuccessMessage(message)
  }, [])

  const requestProfilePanel = useCallback(() => {
    setProfilePanelRequest((count) => count + 1)
  }, [])

  const openAuthModal = useCallback((redirectTo) => {
    setAuthModalRedirectTo(redirectTo ?? null)
    setAuthModalOpen(true)
  }, [])
  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false)
    setAuthModalRedirectTo(null)
  }, [])

  const setToken = useCallback((value) => {
    const next = value || null
    setMemoryToken(next)
    setTokenState(next)
  }, [])

  // Memory access JWT expires often. Session hint means refresh cookie / stored
  // refresh token can mint a new access token — do not treat that as logged out.
  const isAuthenticated = Boolean(getValidAccessToken(token)) || hasSessionHint()

  useEffect(() => {
    setAccessTokenGetter(() => getMemoryToken())
    setOnAuthRequired(() => {
      if (typeof window === 'undefined') return
      const pathname = window.location.pathname || ''
      // Guests must browse search, PDP, home, etc. without a forced login modal.
      // Protected screens (account, community, gift card, …) open the modal themselves.
      if (isPublicBrowsePath(pathname)) return
      openAuthModal(`${pathname}${window.location.search || ''}`)
    })
    return () => setOnAuthRequired(null)
  }, [openAuthModal])

  useEffect(() => {
    return subscribeMemoryToken((next) => {
      setTokenState(next)
      if (!next) setUser(null)
    })
  }, [])

  useEffect(() => {
    let alive = true

    ;(async () => {
      clearLegacyAuthStorage()

      // Restore access JWT from local/session storage first (survives F5).
      hydrateMemoryTokenFromSession()
      let currentToken = getMemoryToken()
      if (currentToken && !isTokenExpired(currentToken)) {
        setMemoryToken(currentToken)
        setSessionHint()
        if (alive) setTokenState(currentToken)
      } else {
        try {
          let refreshed = await refreshUserAccessToken()
          if (!refreshed && (hasSessionHint() || getStoredRefreshToken())) {
            await new Promise((r) => setTimeout(r, 350))
            refreshed = await refreshUserAccessToken()
          }
          if (refreshed) {
            currentToken = refreshed
            // Always write persistence — even if this Strict Mode effect was cleaned up.
            setMemoryToken(refreshed)
            setSessionHint()
            if (alive) setTokenState(refreshed)
          } else {
            // Soft miss: keep persisted AT/RT/hint. Never clear here —
            // cancelled Strict Mode mounts must not wipe a sibling boot that succeeded.
            currentToken = getMemoryToken()
            if (currentToken && isTokenExpired(currentToken)) {
              currentToken = null
            }
            if (alive && !currentToken) setTokenState(null)
          }
        } catch {
          currentToken = getMemoryToken()
          if (currentToken && isTokenExpired(currentToken)) currentToken = null
          if (alive && !currentToken) setTokenState(null)
        }
      }

      if (!alive) return

      if (!currentToken || isTokenExpired(currentToken)) {
        // Soft miss: keep hint/stored refresh so a later navigation can recover.
        // Only a real 401 inside refreshUserAccessToken clears the session.
        setUser(null)
        setAuthChecked(true)
        return
      }

      try {
        const profileData = await fetchUserProfileWithRetry(() =>
          authService.getProfile(),
        )
        if (alive) setUser(profileData ?? null)
      } catch (err) {
        if (!alive) return
        if (isProfileNotFoundError(err)) {
          const minimal = buildMinimalUser(currentToken)
          if (minimal) setUser(minimal)
        } else {
          const status = err?.response?.status
          if (status === 401) {
            // Do not wipe session on a single profile 401 — try one refresh first.
            // (Stale AT + valid RT is common right after F5.)
            const recovered = await refreshUserAccessToken()
            if (recovered) {
              setMemoryToken(recovered)
              setTokenState(recovered)
              const minimal = buildMinimalUser(recovered)
              if (minimal) setUser(minimal)
              try {
                const profileData = await fetchUserProfileWithRetry(() =>
                  authService.getProfile(),
                )
                if (alive && profileData) setUser(profileData)
              } catch {
                /* keep minimal user */
              }
            } else if (!hasSessionHint() && !getStoredRefreshToken()) {
              await performLogout({ server: false })
              setTokenState(null)
              setUser(null)
            } else {
              const minimal = buildMinimalUser(currentToken)
              if (minimal) setUser(minimal)
            }
          } else {
            const minimal = buildMinimalUser(currentToken)
            if (minimal) setUser(minimal)
          }
        }
      } finally {
        if (alive) setAuthChecked(true)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (payload) => {
    const res = await authService.login(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const verifyOtp = useCallback(async (payload) => {
    const { registrationName, authFlow, ...otpPayload } = payload ?? {}
    const res = await authService.verifyOtp(otpPayload)
    const data = unwrapApiData(res)
    // OTP verify shape: { success, data: { userId, accessToken, refreshToken } }
    const accessToken =
      data?.accessToken ??
      data?.access_token ??
      res?.data?.data?.accessToken ??
      res?.data?.accessToken
    const refreshToken =
      data?.refreshToken ??
      data?.refresh_token ??
      data?.refereshToken ??
      res?.data?.data?.refreshToken ??
      res?.data?.refreshToken

    // Persist both tokens BEFORE profile fetch so an F5 mid-login still recovers.
    if (refreshToken) {
      setStoredRefreshToken(refreshToken)
    } else {
      rememberRefreshTokenFromAuthPayload(data)
      rememberRefreshTokenFromAuthPayload(res?.data)
    }
    if (accessToken) {
      setSessionHint()
      setToken(accessToken)
    } else if (refreshToken) {
      setSessionHint()
    }

    if (accessToken) {
      const userFromVerify = extractAuthUser(data)
      if (userFromVerify) {
        setUser(userFromVerify)
      }
      try {
        const profileData = await fetchUserProfileWithRetry(() =>
          authService.getProfile(),
        )
        if (profileData) setUser(profileData)
      } catch {
        if (!userFromVerify) {
          const minimal = buildMinimalUser(accessToken, {
            ...(registrationName ? { name: registrationName } : {}),
          })
          if (minimal) setUser(minimal)
        }
      }
      showAuthSuccessMessage(
        authFlow === 'register'
          ? 'Account created successfully'
          : 'Logged in successfully',
      )
      return data
    }
    return data
  }, [setToken, showAuthSuccessMessage])

  const resendOtp = useCallback(async (payload) => {
    const res = await authService.resendOtp(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const logout = useCallback(async () => {
    trackEvent({ eventType: 'auth_logout' }, { immediate: true })
    await performLogout({ server: true })
    setTokenState(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!getValidAccessToken(getCurrentAccessToken())) return null
    try {
      const profileData = await fetchUserProfileWithRetry(() =>
        authService.getProfile(),
        { attempts: 2, delayMs: 300 },
      )
      setUser(profileData ?? null)
      return profileData
    } catch {
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      token: getValidAccessToken(token),
      user,
      isAuthenticated,
      authChecked,
      authModalOpen,
      authModalRedirectTo,
      openAuthModal,
      closeAuthModal,
      requestProfilePanel,
      profilePanelRequest,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      setToken,
      refreshUser,
      getDeviceId: getOrCreateDeviceId,
      authSuccessMessage,
      showAuthSuccessMessage,
      clearAuthSuccessMessage,
    }),
    [
      token,
      user,
      isAuthenticated,
      authChecked,
      authModalOpen,
      authModalRedirectTo,
      openAuthModal,
      closeAuthModal,
      requestProfilePanel,
      profilePanelRequest,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      setToken,
      refreshUser,
      authSuccessMessage,
      showAuthSuccessMessage,
      clearAuthSuccessMessage,
    ]
  )

  if (!authChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      <AuthSuccessToast />
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
