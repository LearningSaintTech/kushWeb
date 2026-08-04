import { useEffect, useRef, useState } from 'react'

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

/**
 * Reel player — fills parent box.
 * Click video or play/pause control to toggle playback.
 */
export default function ReelPlayer({
  src,
  poster,
  active = false,
  author,
  caption,
  following = false,
  onFollow,
  onProfileClick,
  onTogglePlay,
}) {
  const videoRef = useRef(null)
  const hideTimerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [showControl, setShowControl] = useState(true)

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

    if (active) {
      const playPromise = video.play()
      if (playPromise?.catch) {
        playPromise
          .then(() => {
            setPlaying(true)
            flashControl(true)
          })
          .catch(() => {
            setPlaying(false)
            setShowControl(true)
          })
      } else {
        setPlaying(true)
        flashControl(true)
      }
    } else {
      video.pause()
      setPlaying(false)
      setShowControl(true)
    }

    return () => {
      video.pause()
    }
  }, [active, src])

  const setPlayback = (shouldPlay) => {
    const video = videoRef.current
    if (!video) return
    if (shouldPlay) {
      video
        .play()
        .then(() => {
          setPlaying(true)
          flashControl(true)
          onTogglePlay?.(true)
        })
        .catch(() => {
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
    // Don't steal clicks from profile / follow
    if (event.target.closest('[data-reel-ui]')) return
    setPlayback(!playing)
  }

  const handleControlClick = (event) => {
    event.stopPropagation()
    setPlayback(!playing)
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-900"
      onClick={handleTap}
      role="presentation"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={active}
        preload={active ? 'auto' : 'metadata'}
        disablePictureInPicture
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
        aria-hidden
      />

      {/* Play / pause control — always clickable; fades while playing */}
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
        className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
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
          <div className="min-w-0">
            <button
              type="button"
              data-reel-ui
              onClick={onProfileClick}
              className="block cursor-pointer truncate text-left font-inter text-sm font-semibold text-white"
            >
              {author?.name || 'Member'}
            </button>
            <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
              {author?.role || 'CREATOR'}
            </p>
          </div>
          <button
            type="button"
            data-reel-ui
            onClick={onFollow}
            className="ml-auto shrink-0 cursor-pointer rounded-full border border-white/70 px-3 py-1 font-inter text-xs font-semibold text-white transition hover:bg-white/15"
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        {caption ? (
          <p className="mt-3 line-clamp-3 font-inter text-sm leading-relaxed text-white/95">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  )
}
