import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import { useAuth } from '../../app/context/AuthContext'
import { debugLog } from '../../utils/debugLog'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.khushpehno.app'
const APP_STORE_URL = 'https://apps.apple.com/in/app/khush-fashion-shopping-app/id6761365897'

function getUserAgent() {
  return typeof navigator !== 'undefined'
    ? navigator.userAgent || navigator.vendor || window.opera || ''
    : ''
}

/** Phone/tablet UA or narrow viewport — these users are sent to the Khush app. */
export function isMobileDevice() {
  return (
    /android|iPad|iPhone|iPod|windows phone/i.test(getUserAgent()) ||
    (typeof window !== 'undefined' && window.innerWidth < 768)
  )
}

/** Open the Khush app store listing: App Store on iOS, Play Store otherwise. */
export function openKhushAppStore() {
  const userAgent = getUserAgent()
  window.location.href =
    /iPad|iPhone|iPod/.test(userAgent) && !/android/i.test(userAgent)
      ? APP_STORE_URL
      : PLAY_STORE_URL
}

export function useExploreFashion() {
  const navigate = useNavigate()
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()

  return () => {
    debugLog('[CommunityProfile] Explore Fashion clicked')
    if (isMobileDevice()) {
      openKhushAppStore()
      return
    }

    if (isAuthenticated) {
      navigate(ROUTES.COMMUNITY_FEED)
      return
    }
    if (!authChecked) {
      navigate(ROUTES.COMMUNITY_ENTER)
      return
    }
    openAuthModal(ROUTES.COMMUNITY_FEED)
  }
}

export default function ExploreFashionButton({ className = '', floating = false }) {
  const onExplore = useExploreFashion()

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onExplore()
      }}
      className={`group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border-2 border-white bg-black px-5 py-2 font-inter text-[13px] font-medium leading-none text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:scale-[1.02] hover:bg-neutral-950 active:scale-95 ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-button-shine"
        aria-hidden
      />
      <span className="relative z-10">Explore Community</span>
      <span
        className="relative z-10 text-base font-light leading-none transition-transform duration-300 group-hover:translate-x-0.5"
        aria-hidden
      >
        ›
      </span>
    </button>
  )
}
