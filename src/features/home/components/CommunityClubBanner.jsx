import { Link } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { useAuth } from '../../../app/context/AuthContext'
import { useCommunityProfile } from '../../community/context/CommunityProfileContext'
import { isCommunityProfileDeleted } from '../../../services/communityProfile.mappers.js'
import { isMobileDevice, openKhushAppStore } from '../../../shared/components/ExploreFashionButton.jsx'
import communityClub from '../../../assets/images/community/communityclub.jpg'
import communityPhone from '../../../assets/images/community/communityphone.jpg'

/** A logged-in user "has a community profile" once they've joined (username or creator/designer role). */
function hasCommunityProfile(profile) {
  if (!profile || typeof profile !== 'object') return false
  if (isCommunityProfileDeleted(profile)) return false
  return Boolean(profile.username || profile.isCreator || profile.isDesigner)
}

/**
 * Banner destination:
 * - logged in + community profile → feed
 * - logged in, auth/profile still loading → /community/enter (waits for profile, then routes)
 * - guest, or logged in without a profile → /community landing
 */
function useCommunityBannerTarget() {
  const { isAuthenticated, authChecked } = useAuth()
  const { profile, loading } = useCommunityProfile()

  if (!authChecked) return ROUTES.COMMUNITY
  if (!isAuthenticated) return ROUTES.COMMUNITY
  if (hasCommunityProfile(profile)) return ROUTES.COMMUNITY_FEED
  if (loading) return ROUTES.COMMUNITY_ENTER
  return ROUTES.COMMUNITY
}

/** Home promo banner (below Limited Edition) → community */
export default function CommunityClubBanner() {
  const to = useCommunityBannerTarget()

  return (
    <section className="w-full overflow-x-hidden bg-white" aria-label="Community club">
      <Link
        to={to}
        className="group mx-auto block w-full max-w-[1920px] cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        aria-label="Join the Khush Pehno community club"
        onClick={(e) => {
          // Phones go to the Khush app, same as the Explore Fashion button.
          if (isMobileDevice()) {
            e.preventDefault()
            openKhushAppStore()
          }
        }}
      >
        <picture className="block w-full">
          <source media="(max-width: 767px)" srcSet={communityPhone} width={1080} height={1920} />
          <img
            src={communityClub}
            alt="Khush Pehno Community Club — join the community"
            width={1920}
            height={1080}
            className="block h-auto w-full max-w-full object-contain select-none transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </picture>
      </Link>
    </section>
  )
}
