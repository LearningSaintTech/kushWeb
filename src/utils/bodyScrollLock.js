/**
 * Reference-counted body scroll lock.
 * Prevents stuck overflow:hidden after fold/unfold or overlapping overlays.
 */

let lockCount = 0
let savedHtmlOverflow = ''
let savedBodyOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    savedHtmlOverflow = document.documentElement.style.overflow
    savedBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount <= 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.documentElement.style.overflow = savedHtmlOverflow
    document.body.style.overflow = savedBodyOverflow
    savedHtmlOverflow = ''
    savedBodyOverflow = ''
  }
}

/** Force-clear stuck locks (e.g. after fold unfold with no visible modal). */
export function forceUnlockBodyScroll() {
  if (typeof document === 'undefined') return
  lockCount = 0
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  savedHtmlOverflow = ''
  savedBodyOverflow = ''
}

export function hasActiveBodyScrollLock() {
  return lockCount > 0
}

/** True when a visible modal/dialog should keep the page locked. */
export function hasVisibleScrollLockingOverlay() {
  if (typeof document === 'undefined') return false
  const nodes = document.querySelectorAll(
    '[aria-modal="true"], [data-scroll-lock="true"]',
  )
  for (const node of nodes) {
    const style = window.getComputedStyle(node)
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      return true
    }
  }
  return false
}
