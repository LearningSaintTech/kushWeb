import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../utils/constants'
import { debugLog } from '../../../utils/debugLog'
import shaktimaanImg from '../../../assets/images/navBar/Shaktimaan.png'

/**
 * Fixed floating Shaktimaan on the homepage — phone: below full header;
 * desktop: under cart/profile. Not stuck to the banner.
 *
 * TEMP spin: use `shaktimaan-banner-spin` + inner `shaktimaan-banner-spin-inner`
 * instead of `shaktimaan-banner-float` when testing the turntable.
 */
export default function ShaktimaanFab() {
  const navigate = useNavigate()

  const handleEnter = () => {
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
      {/* TEMP: swap to shaktimaan-banner-spin (+ inner spin-inner) for turntable */}
      <div className="shaktimaan-banner-float pointer-events-auto">
        <button
          type="button"
          onClick={handleEnter}
          aria-label="Enter Shaktimaan collection"
          className="shaktimaan-banner-enter group block cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <img
            src={shaktimaanImg}
            alt="Shaktimaan — tap to enter"
            draggable={false}
            className="select-none object-cover object-[center_8%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]
              h-[3.75rem] w-[2.9rem]
              sm:h-[4.5rem] sm:w-[3.5rem]
              md:h-[5.75rem] md:w-[4.4rem]
              lg:h-[6.75rem] lg:w-[5.15rem]"
          />
        </button>
      </div>
    </div>
  )
}
