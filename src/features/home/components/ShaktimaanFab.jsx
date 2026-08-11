import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { debugLog } from '../../../utils/debugLog'
import shaktimaanGif from '../../../assets/images/navBar/Shaktimaan-home.gif'
import shaktimaanPng from '../../../assets/images/navBar/Shaktimaan.png'

/**
 * Fixed floating Shaktimaan badge.
 * - Home: GIF + navigates to collection
 * - Collection page: PNG, decorative only (already on page)
 */
export default function ShaktimaanFab({
  variant = 'home',
}) {
  const navigate = useNavigate()
  const isCollection = variant === 'collection'
  const imgSrc = isCollection ? shaktimaanPng : shaktimaanGif

  const handleEnter = () => {
    if (isCollection) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    debugLog('[Home] Shaktimaan fab tap to enter')
    navigate(ROUTES.SHAKTIMAN_COLLECTION)
  }

  return (
    <div
      className="pointer-events-none fixed z-40
        top-[7.6rem] right-2
        sm:top-[7.75rem] sm:right-3
        md:top-[5rem] md:right-5
        lg:top-[5.25rem] lg:right-6"
    >
      <div
        className={`pointer-events-auto ${
          isCollection
            ? 'shaktimaan-banner-float'
            : 'shaktimaan-banner-float shaktimaan-banner-float--home'
        }`}
      >
        <button
          type="button"
          onClick={handleEnter}
          aria-label={
            isCollection
              ? 'Shaktimaan collection'
              : 'Enter Shaktimaan collection'
          }
          className={`group block cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
            isCollection
              ? 'shaktimaan-banner-enter'
              : 'shaktimaan-banner-enter shaktimaan-banner-enter--home'
          }`}
        >
          <img
            src={imgSrc}
            alt="Shaktimaan"
            draggable={false}
            className={`select-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]
              h-[3.75rem] w-[3.75rem]
              sm:h-[4.5rem] sm:w-[4.5rem]
              md:h-[5.75rem] md:w-[5.75rem]
              lg:h-[6.75rem] lg:w-[6.75rem]
              ${isCollection ? 'object-cover object-[center_8%]' : 'object-contain'}`}
          />
        </button>
      </div>
    </div>
  )
}
