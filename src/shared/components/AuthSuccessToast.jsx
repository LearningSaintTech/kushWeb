import { useEffect } from 'react'
import { useAuth } from '../../app/context/AuthContext'

export default function AuthSuccessToast() {
  const { authSuccessMessage, clearAuthSuccessMessage } = useAuth()

  useEffect(() => {
    if (!authSuccessMessage) return undefined
    const id = setTimeout(() => clearAuthSuccessMessage(), 2500)
    return () => clearTimeout(id)
  }, [authSuccessMessage, clearAuthSuccessMessage])

  if (!authSuccessMessage) return null

  return (
    <div
      className="fixed top-4 sm:top-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[70] flex justify-center pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium shadow-lg">
        {authSuccessMessage}
      </div>
    </div>
  )
}
