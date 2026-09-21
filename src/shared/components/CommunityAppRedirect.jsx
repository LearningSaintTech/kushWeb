import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { isPhoneDevice, openKhushApp } from '../../utils/openKhushApp.js'

/**
 * Community is app-first on phones. Shared post/reel links open a prompt
 * and send the visitor to the Khush app / store.
 */
export default function CommunityAppRedirect() {
  const location = useLocation()
  const sent = useRef(false)

  const path = `${location.pathname}${location.search || ''}`
  const onCommunity = location.pathname.startsWith('/community')
  const phone = isPhoneDevice()

  useEffect(() => {
    if (!onCommunity || !phone || sent.current) return undefined
    sent.current = true
    const timer = window.setTimeout(() => {
      openKhushApp(path)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [onCommunity, phone, path])

  if (!onCommunity || !phone) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl bg-white px-5 py-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Khush Community
        </p>
        <h2 className="mt-2 font-inter text-xl font-bold text-black">Open in the Khush app</h2>
        <p className="mt-2 font-inter text-sm leading-relaxed text-neutral-600">
          Posts and reels are built for the app. Continue there for the full experience.
        </p>
        <button
          type="button"
          onClick={() => openKhushApp(path)}
          className="mt-5 w-full cursor-pointer rounded-full bg-black py-3 font-inter text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Open app
        </button>
      </div>
    </div>
  )
}
