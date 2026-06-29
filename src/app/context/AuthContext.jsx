import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { authService } from '../../services/auth.service.js'
import { setAccessTokenGetter, getCurrentAccessToken } from '../../services/axiosClient.js'
import { getMemoryToken, setMemoryToken, subscribeMemoryToken, clearMemoryToken } from '../../utils/tokenMemory.js'
import { getValidAccessToken, isTokenExpired } from '../../utils/authToken.js'
import { refreshUserAccessToken } from '../../utils/authSession.js'
import { performLogout, clearLegacyAuthStorage } from '../../utils/sessionLogout.js'
import { setSessionHint } from '../../utils/sessionHint.js'
import { getOrCreateDeviceId } from '../../utils/deviceId.js'
import {
  buildMinimalUser,
  extractAuthUser,
  fetchUserProfileWithRetry,
  isProfileNotFoundError,
  unwrapApiData,
} from '../../utils/authProfile.js'
import AuthSuccessToast from '../../shared/components/AuthSuccessToast.jsx'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getMemoryToken())
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

  const isAuthenticated = Boolean(getValidAccessToken(getMemoryToken()))

  useEffect(() => {
    setAccessTokenGetter(() => getMemoryToken())
    return subscribeMemoryToken((next) => {
      setTokenState(next)
      if (!next) setUser(null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      clearLegacyAuthStorage()

      let currentToken = getMemoryToken()
      if (!currentToken || isTokenExpired(currentToken)) {
        try {
          const refreshed = await refreshUserAccessToken()
          if (refreshed) {
            currentToken = refreshed
            if (!cancelled) {
              setMemoryToken(refreshed)
              setTokenState(refreshed)
            }
          }
        } catch {
          if (!cancelled) {
            clearMemoryToken()
            setTokenState(null)
          }
        }
      }

      if (cancelled) return

      if (!currentToken || isTokenExpired(currentToken)) {
        setUser(null)
        setAuthChecked(true)
        return
      }

      try {
        const profileData = await fetchUserProfileWithRetry(() =>
          authService.getProfile(),
        )
        if (!cancelled) setUser(profileData ?? null)
      } catch (err) {
        if (!cancelled) {
          if (isProfileNotFoundError(err)) {
            const minimal = buildMinimalUser(currentToken)
            if (minimal) setUser(minimal)
          } else {
            await performLogout({ server: true })
            setTokenState(null)
            setUser(null)
          }
        }
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()

    return () => {
      cancelled = true
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
    const accessToken = data?.accessToken ?? data?.access_token
    if (accessToken) {
      setSessionHint()
      setToken(accessToken)
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
