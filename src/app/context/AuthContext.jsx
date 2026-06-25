import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { authService } from '../../services/auth.service.js'
import { setAccessTokenGetter, getCurrentAccessToken } from '../../services/axiosClient.js'
import { getMemoryToken, setMemoryToken, subscribeMemoryToken, clearMemoryToken } from '../../utils/tokenMemory.js'
import { getValidAccessToken, isTokenExpired } from '../../utils/authToken.js'
import { refreshUserAccessToken } from '../../utils/authSession.js'
import { performLogout, clearLegacyAuthStorage } from '../../utils/sessionLogout.js'
import { setSessionHint } from '../../utils/sessionHint.js'
import { getOrCreateDeviceId } from '../../utils/deviceId.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getMemoryToken())
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalRedirectTo, setAuthModalRedirectTo] = useState(null)

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
        const res = await authService.getProfile()
        const data = res?.data?.data ?? res?.data
        if (!cancelled) setUser(data ?? null)
      } catch {
        if (!cancelled) {
          await performLogout({ server: true })
          setTokenState(null)
          setUser(null)
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
    const res = await authService.verifyOtp(payload)
    const data = res?.data?.data ?? res?.data
    const accessToken = data?.accessToken ?? data?.access_token
    if (accessToken) {
      setSessionHint()
      setToken(accessToken)
      try {
        const profileRes = await authService.getProfile()
        const profileData = profileRes?.data?.data ?? profileRes?.data
        setUser(profileData ?? null)
      } catch {
        /* token is valid; profile can load on next navigation */
      }
      return data
    }
    return data
  }, [setToken])

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
      const res = await authService.getProfile()
      const data = res?.data?.data ?? res?.data
      setUser(data ?? null)
      return data
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
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      setToken,
      refreshUser,
      getDeviceId: getOrCreateDeviceId,
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
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      setToken,
      refreshUser,
    ]
  )

  if (!authChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
