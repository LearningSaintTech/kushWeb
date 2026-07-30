import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReelCard from '../components/reels/ReelCard'
import { MOCK_REELS } from '../data/mockReels'

export default function CommunityReelsFeed() {
  const { openProfile } = useOutletContext() ?? {}
  const scrollerRef = useRef(null)
  const itemRefs = useRef([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean)
    if (!nodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        let best = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry
          }
        }
        if (!best) return
        const index = Number(best.target.getAttribute('data-reel-index'))
        if (!Number.isNaN(index)) setActiveIndex(index)
      },
      {
        root: scrollerRef.current,
        threshold: [0.35, 0.5, 0.65],
      },
    )

    nodes.forEach((node) => observer.observe(node))

    // Ensure first reel is active on load
    setActiveIndex(0)

    return () => observer.disconnect()
  }, [])

  const goTo = useCallback((index) => {
    const clamped = Math.max(0, Math.min(MOCK_REELS.length - 1, index))
    const node = itemRefs.current[clamped]
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveIndex(clamped)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        goTo(activeIndex + 1)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, goTo])

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div
        ref={scrollerRef}
        className="scrollbar-hide h-full min-h-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        aria-label="Community reels"
      >
        {MOCK_REELS.map((reel, index) => (
          <section
            key={reel.id}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            data-reel-index={index}
            className="flex min-h-full snap-start snap-always flex-col items-center justify-center py-6"
            aria-label={`Reel ${index + 1} of ${MOCK_REELS.length}`}
          >
            <ReelCard
              reel={reel}
              active={index === activeIndex}
              onProfileClick={openProfile}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
