import { useEffect, useRef, useState } from 'react'
import TaggedProductsCarousel from './TaggedProductsCarousel'

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
    </svg>
  )
}

function PauseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
    </svg>
  )
}

function PackageIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  )
}

/**
 * Fullscreen reel player — only loads/plays when active (or warm neighbor).
 * Bottom-left: creator + caption + Follow / tagged toggle
 * (Like / Comment / Share / Save live outside the card in ReelCard)
 */
export default function ReelPlayer({
  src,
  poster,
  active = false,
  warm = false,
  author,
  caption,
  following = false,
  showFollow = true,
  taggedProducts = [],
  designedBy = null,
  contentId = null,
  onFollow,
  onProfileClick,
  onTogglePlay,
}) {
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const playRequestRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [showControl, setShowControl] = useState(true)
  const [showTagged, setShowTagged] = useState(false)
  const shouldMountSrc = Boolean(src) && (active || warm)
  const hasProducts = Array.isArray(taggedProducts) && taggedProducts.length > 0

  useEffect(() => {
    if (!active) setShowTagged(false)
  }, [active])

  const flashControl = (isPlaying) => {
    setShowControl(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControl(false), 900)
    }
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    if (shouldMountSrc) {
      if (video.getAttribute('src') !== src) {
        video.src = src
        video.load()
      }
      return undefined
    }

    video.pause()
    video.removeAttribute('src')
    video.load()
    setPlaying(false)
    setShowControl(true)
    return undefined
  }, [shouldMountSrc, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    const requestId = ++playRequestRef.current

    if (!active || !shouldMountSrc) {
      video.pause()
      setPlaying(false)
      setShowControl(true)
      return undefined
    }

    let cancelled = false
    const tryPlay = () => {
      if (cancelled || playRequestRef.current !== requestId) return
      const playPromise = video.play()
      if (playPromise?.then) {
        playPromise
          .then(() => {
            if (cancelled || playRequestRef.current !== requestId) return
            setPlaying(true)
            flashControl(true)
          })
          .catch(() => {
            if (cancelled || playRequestRef.current !== requestId) return
            setPlaying(false)
            setShowControl(true)
          })
      } else {
        setPlaying(true)
        flashControl(true)
      }
    }

    const t = window.setTimeout(tryPlay, 40)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      video.pause()
    }
  }, [active, shouldMountSrc, src])

  const setPlayback = (shouldPlay) => {
    const video = videoRef.current
    if (!video || !shouldMountSrc) return
    if (shouldPlay) {
      const requestId = ++playRequestRef.current
      video
        .play()
        .then(() => {
          if (playRequestRef.current !== requestId) return
          setPlaying(true)
          flashControl(true)
          onTogglePlay?.(true)
        })
        .catch(() => {
          if (playRequestRef.current !== requestId) return
          setPlaying(false)
          setShowControl(true)
        })
    } else {
      video.pause()
      setPlaying(false)
      setShowControl(true)
      onTogglePlay?.(false)
    }
  }

  const handleTap = (event) => {
    if (event.target.closest('[data-reel-ui]')) return
    if (!active) return
    setPlayback(!playing)
  }

  const handleControlClick = (event) => {
    event.stopPropagation()
    setPlayback(!playing)
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-neutral-950"
      onClick={handleTap}
      role="presentation"
    >
      <video
        ref={videoRef}
        poster={poster || undefined}
        muted
        loop
        playsInline
        preload={active ? 'auto' : warm ? 'metadata' : 'none'}
        disablePictureInPicture
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
        aria-hidden
      />

      <div
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
          showControl || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          data-reel-ui
          onClick={handleControlClick}
          aria-label={playing ? 'Pause reel' : 'Play reel'}
          className="pointer-events-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-[2px] transition hover:bg-black/60 sm:h-16 sm:w-16"
        >
          {playing ? (
            <PauseIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          ) : (
            <PlayIcon className="ml-0.5 h-7 w-7 sm:h-8 sm:w-8" />
          )}
        </button>
      </div>

      <div
        data-reel-ui
        className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasProducts && showTagged ? (
          <div className="mb-3 max-h-[38%] overflow-y-auto">
            <TaggedProductsCarousel
              products={taggedProducts}
              designedBy={designedBy}
              contentId={contentId}
              variant="dark"
              compact
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-reel-ui
            onClick={onProfileClick}
            className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/80"
            aria-label={`Open ${author?.name || 'creator'} profile`}
          >
            {author?.avatar ? (
              <img src={author.avatar} alt="" className="h-full w-full object-cover" />
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              data-reel-ui
              onClick={onProfileClick}
              className="block max-w-full cursor-pointer truncate text-left font-inter text-sm font-semibold text-white"
            >
              {author?.name || 'Member'}
            </button>
            <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              {author?.role || 'CREATOR'}
            </p>
          </div>
          {showFollow ? (
            <button
              type="button"
              data-reel-ui
              onClick={onFollow}
              className="shrink-0 cursor-pointer rounded-full border border-white/70 bg-black/35 px-3 py-1.5 font-inter text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {following ? 'Following' : 'Follow'}
            </button>
          ) : null}
          {hasProducts ? (
            <button
              type="button"
              data-reel-ui
              onClick={() => setShowTagged((v) => !v)}
              aria-label={showTagged ? 'Hide tagged products' : 'Show tagged products'}
              aria-pressed={showTagged}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition ${
                showTagged ? 'bg-white text-black' : 'bg-white/90 text-black hover:bg-white'
              }`}
            >
              <PackageIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {caption ? (
          <p className="mt-2.5 line-clamp-2 font-inter text-sm leading-relaxed text-white/95">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  )
}
