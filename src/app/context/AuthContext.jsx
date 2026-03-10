import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { authService } from '../../services/auth.service.js'
import { ACCESS_TOKEN_KEY, setAccessTokenGetter, setOnUnauthorized } from '../../services/axiosClient.js'

const DEVICE_ID_KEY = 'khush_device_id'

function getOrCreateDeviceId() {
  try {
    let id = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) : null
    if (!id) {
      id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return `web_${Date.now()}`
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
    } catch {
      return null
    }
  })
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
    setTokenState(value)
    try {
      if (typeof window !== 'undefined') {
        if (value) localStorage.setItem(ACCESS_TOKEN_KEY, value)
        else localStorage.removeItem(ACCESS_TOKEN_KEY)
      }
    } catch {}
  }, [])

  const isAuthenticated = Boolean(token)

  useEffect(() => {
    setAccessTokenGetter(() => token)
  }, [token])

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setUser(null)
      setAuthChecked(true)
      return
    }
    authService.getProfile()
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        if (!cancelled) setUser(data ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => { cancelled = true }
  }, [token])

  const refreshAccessToken = useCallback(async () => {
    const deviceId = getOrCreateDeviceId()
    const res = await authService.newAccessToken()
    const data = res?.data?.data ?? res?.data
    const newToken = data?.accessToken ?? data?.access_token
    if (newToken) {
      setToken(newToken)
      return newToken
    }
    return null
  }, [setToken])

  useEffect(() => {
    setOnUnauthorized(async (response, error) => {
      const config = response?.config
      if (config?.url?.includes('newAccessToken') || config?.url?.includes('logout')) return
      try {
        const newToken = await refreshAccessToken()
        if (newToken && config) {
          config.headers.Authorization = `Bearer ${newToken}`
          return await fetch(config.url, { ...config, headers: config.headers })
        }
      } catch {}
      setToken(null)
      setUser(null)
    })
    return () => setOnUnauthorized(() => {})
  }, [refreshAccessToken, setToken])

  const login = useCallback(async (payload) => {
    const res = await authService.login(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const verifyOtp = useCallback(async (payload) => {
    const deviceId = getOrCreateDeviceId()
    const res = await authService.verifyOtp(payload)
    const data = res?.data?.data ?? res?.data
    const accessToken = data?.accessToken ?? data?.access_token
    if (accessToken) {
      setToken(accessToken)
      return data
    }
    return data
  }, [setToken])

  const resendOtp = useCallback(async (payload) => {
    const res = await authService.resendOtp(payload)
    return res?.data?.data ?? res?.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {}
    setToken(null)
    setUser(null)
  }, [setToken])

  const refreshUser = useCallback(async () => {
    if (!token) return null
    try {
      const res = await authService.getProfile()
      const data = res?.data?.data ?? res?.data
      setUser(data ?? null)
      return data
    } catch {
      return null
    }
  }, [token])

  const value = useMemo(
    () => ({
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
