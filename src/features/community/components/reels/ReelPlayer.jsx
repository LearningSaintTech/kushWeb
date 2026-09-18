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

function MuteIcon({ className, muted }) {
  if (muted) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 5.326A.75.75 0 0110.5 6v12a.75.75 0 01-1.152.624L4.8 15.75H2.25A.75.75 0 011.5 15V9a.75.75 0 01.75-.75H4.8l4.548-2.874z" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 5.326A.75.75 0 0110.5 6v12a.75.75 0 01-1.152.624L4.8 15.75H2.25A.75.75 0 011.5 15V9a.75.75 0 01.75-.75H4.8l4.548-2.874z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8.25a6 6 0 010 7.5M18.75 6a9.75 9.75 0 010 12" />
    </svg>
  )
}

function readReelMutedPref() {
  try {
    const stored = sessionStorage.getItem('khush_reel_muted')
    if (stored === '0') return false
    if (stored === '1') return true
  } catch {
    // ignore
  }
  return true
}

function writeReelMutedPref(muted) {
  try {
    sessionStorage.setItem('khush_reel_muted', muted ? '1' : '0')
  } catch {
    // ignore
  }
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
  onAspectChange,
}) {
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const playRequestRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(readReelMutedPref)
  const [showControl, setShowControl] = useState(true)
  const [showTagged, setShowTagged] = useState(false)
  const shouldMountSrc = Boolean(src) && (active || warm)
  const hasProducts = Array.isArray(taggedProducts) && taggedProducts.length > 0

  const handleLoadedMetadata = (e) => {
    const video = e.target
    if (video?.videoWidth && video?.videoHeight) {
      const { videoWidth, videoHeight } = video
      const ratio = videoWidth / videoHeight
      let orientation = 'portrait'
      if (ratio > 1.15) {
        orientation = 'landscape'
      } else if (ratio >= 0.85) {
        orientation = 'square'
      }
      onAspectChange?.({
        width: videoWidth,
        height: videoHeight,
        ratio,
        orientation,
      })
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.videoWidth && video.videoHeight) {
      const { videoWidth, videoHeight } = video
      const ratio = videoWidth / videoHeight
      let orientation = 'portrait'
      if (ratio > 1.15) {
        orientation = 'landscape'
      } else if (ratio >= 0.85) {
        orientation = 'square'
      }
      onAspectChange?.({
        width: videoWidth,
        height: videoHeight,
        ratio,
        orientation,
      })
    }
  }, [shouldMountSrc, src, onAspectChange])

  useEffect(() => {
    if (!poster) return undefined
    let cancelled = false
    const img = new Image()
    img.src = poster
    img.onload = () => {
      if (cancelled) return
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight
        let orientation = 'portrait'
        if (ratio > 1.15) orientation = 'landscape'
        else if (ratio >= 0.85) orientation = 'square'
        onAspectChange?.({
          width: img.naturalWidth,
          height: img.naturalHeight,
          ratio,
          orientation,
          isPosterHint: true,
        })
      }
    }
    return () => {
      cancelled = true
    }
  }, [poster, onAspectChange])

  const applyMuted = (next) => {
    setMuted(next)
    writeReelMutedPref(next)
    const video = videoRef.current
    if (video) {
      video.muted = next
      if (!next) video.volume = 1
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (!muted) video.volume = 1
  }, [muted, active, src, shouldMountSrc])

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
    const tryPlay = (forceMuted = muted) => {
      if (cancelled || playRequestRef.current !== requestId) return
      video.muted = forceMuted
      if (!forceMuted) video.volume = 1
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
            if (!forceMuted) {
              applyMuted(true)
              tryPlay(true)
              return
            }
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
      video.muted = muted
      if (!muted) video.volume = 1
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
          video.muted = true
          applyMuted(true)
          video
            .play()
            .then(() => {
              if (playRequestRef.current !== requestId) return
              setPlaying(true)
              flashControl(true)
            })
            .catch(() => {
              if (playRequestRef.current !== requestId) return
              setPlaying(false)
              setShowControl(true)
            })
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

  const authorDisplayName =
    author?.name && String(author.name).trim().toLowerCase() !== 'member'
      ? author.name
      : author?.displayName ||
        author?.fullName ||
        (author?.handle
          ? author.handle.startsWith('@')
            ? author.handle
            : `@${author.handle}`
          : '') ||
        'Creator'

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-neutral-950"
      onClick={handleTap}
      role="presentation"
    >
      <video
        ref={videoRef}
        poster={poster || undefined}
        muted={muted}
        loop
        playsInline
        preload={active ? 'auto' : warm ? 'metadata' : 'none'}
        disablePictureInPicture
        onLoadedMetadata={handleLoadedMetadata}
        className="h-full w-full cursor-pointer object-contain bg-black"
      />

      <button
        type="button"
        data-reel-ui
        onClick={(event) => {
          event.stopPropagation()
          applyMuted(!muted)
        }}
        aria-label={muted ? 'Unmute reel' : 'Mute reel'}
        className="absolute right-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 sm:right-4 sm:top-4"
      >
        <MuteIcon className="h-4 w-4" muted={muted} />
      </button>

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
            className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/80 bg-neutral-800"
            aria-label={`Open ${authorDisplayName} profile`}
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
              className="block max-w-full cursor-pointer truncate text-left font-inter text-sm font-semibold text-white hover:underline"
            >
              {authorDisplayName}
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
