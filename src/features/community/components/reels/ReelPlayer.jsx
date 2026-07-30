import { useEffect, useRef } from 'react'

/**
 * Reel player — design size 500×768, responsive via aspect-ratio padding box.
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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    if (active) {
      const playPromise = video.play()
      if (playPromise?.catch) playPromise.catch(() => {})
    } else {
      video.pause()
    }

    return () => {
      video.pause()
    }
  }, [active, src])

  const handleTap = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      onTogglePlay?.(true)
    } else {
      video.pause()
      onTogglePlay?.(false)
    }
  }

  return (
    <div className="relative w-full max-w-[500px] overflow-hidden rounded-2xl bg-neutral-900">
      {/* 768 / 500 = 153.6% — reliable aspect box so video never collapses */}
      <div className="relative w-full pt-[153.6%]">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay={active}
          preload="auto"
          disablePictureInPicture
          onClick={handleTap}
          className="absolute inset-0 h-full w-full cursor-pointer object-cover"
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onProfileClick}
              className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-white/80"
              aria-label={`Open ${author.name} profile`}
            >
              <img src={author.avatar} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="min-w-0">
              <button
                type="button"
                onClick={onProfileClick}
                className="block cursor-pointer truncate text-left font-inter text-sm font-semibold text-white"
              >
                {author.name}
              </button>
              <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                {author.role}
              </p>
            </div>
            <button
              type="button"
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
    </div>
  )
}
