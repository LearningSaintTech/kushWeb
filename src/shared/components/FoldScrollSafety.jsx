import { useEffect } from 'react'
import {
  forceUnlockBodyScroll,
  hasVisibleScrollLockingOverlay,
} from '../../utils/bodyScrollLock.js'

/**
 * Samsung Fold / large-phone unfold can leave body overflow:hidden stuck
 * (locks applied under max-md, then the overlay becomes md:hidden).
 * Clear leftover locks when the viewport resizes and nothing modal is open.
 */
export default function FoldScrollSafety() {
  useEffect(() => {
    let timer = null

    const heal = () => {
      if (hasVisibleScrollLockingOverlay()) return
      const htmlOverflow = document.documentElement.style.overflow
      const bodyOverflow = document.body.style.overflow
      if (htmlOverflow === 'hidden' || bodyOverflow === 'hidden') {
        forceUnlockBodyScroll()
      }
    }

    const scheduleHeal = () => {
      if (timer) clearTimeout(timer)
      // Fold animation / Chrome layout settles after a short delay
      timer = setTimeout(heal, 120)
    }

    window.addEventListener('resize', scheduleHeal)
    window.addEventListener('orientationchange', scheduleHeal)
    window.visualViewport?.addEventListener('resize', scheduleHeal)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('resize', scheduleHeal)
      window.removeEventListener('orientationchange', scheduleHeal)
      window.visualViewport?.removeEventListener('resize', scheduleHeal)
    }
  }, [])

  return null
}
