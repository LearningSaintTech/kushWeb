import { useCallback, useEffect, useRef, useState } from 'react'
import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import { useAuth } from '../../../../app/context/AuthContext'
import { isSameCommunityUser } from '../../utils/userIds'

/**
 * Fullscreen Shorts card — adapts aspect ratio (portrait, landscape, square)
 * based on the actual video source to avoid cropping or stretching.
 * Action stack sits beside the player on the bottom-right.
 */
export default function ReelCard({
  reel,
  active = false,
  warm = false,
  shareLabel = 'Share',
  onProfileClick,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
  onDelete,
}) {
  const { user } = useAuth()
  const isOwnReel =
    isSameCommunityUser(user, reel?.author) ||
    isSameCommunityUser(user, reel?.authorId) ||
    isSameCommunityUser(user, reel?.raw?.authorId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [menuOpen])

  const handleDelete = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!isOwnReel || deleting || !reel?.id) return
    const ok = window.confirm('Delete this reel? This cannot be undone.')
    if (!ok) {
      setMenuOpen(false)
      return
    }
    setDeleting(true)
    try {
      await onDelete?.(reel)
    } catch (err) {
      window.alert(err?.message || 'Could not delete reel.')
    } finally {
      setDeleting(false)
      setMenuOpen(false)
    }
  }

  const [aspect, setAspect] = useState(() => {
    const m = reel?.raw?.media?.[0]
    if (m?.width && m?.height) {
      const ratio = m.width / m.height
      let orientation = 'portrait'
      if (ratio > 1.15) orientation = 'landscape'
      else if (ratio >= 0.85) orientation = 'square'
      return { ratio, orientation, width: m.width, height: m.height }
    }
    return { ratio: 9 / 16, orientation: 'portrait' }
  })

  const handleAspectChange = useCallback((newAspect) => {
    if (!newAspect?.ratio) return
    setAspect((prev) => {
      // If we already detected exact video dimensions, ignore poster hints
      if (prev?.isVideo && newAspect.isPosterHint) return prev
      return {
        ratio: newAspect.ratio,
        orientation: newAspect.orientation,
        width: newAspect.width,
        height: newAspect.height,
        isVideo: !newAspect.isPosterHint,
      }
    })
  }, [])

  const orientation = aspect.orientation || 'portrait'
  const isLandscape = orientation === 'landscape'
  const isSquare = orientation === 'square'

  // Dynamic max-width and max-height based on orientation
  const playerStyle = {
    aspectRatio: aspect.ratio ? `${aspect.ratio}` : isLandscape ? '16 / 9' : isSquare ? '1 / 1' : '9 / 16',
    maxHeight: isLandscape
      ? 'min(86dvh, 920px)'
      : isSquare
        ? 'min(88dvh, 860px)'
        : 'calc(100dvh - 1.25rem)',
    maxWidth: isLandscape
      ? 'min(calc(100vw - 240px), 1400px)'
      : isSquare
        ? 'min(calc(100vw - 240px), 860px)'
        : 'min(calc(100vw - 240px), 720px)',
    width: isLandscape || isSquare ? '100%' : 'auto',
    height: !isLandscape && !isSquare ? 'calc(100dvh - 1.25rem)' : 'auto',
  }

  return (
    <article className="relative mx-auto flex h-full w-full items-center justify-center p-2 sm:p-4 xl:p-6">
      <div
        className={`relative flex items-end justify-center gap-2 sm:gap-3.5 xl:gap-5 transition-all duration-300 ${
          isLandscape
            ? 'w-full max-w-[1400px]'
            : isSquare
              ? 'w-full max-w-[860px]'
              : 'h-full w-full max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px]'
        }`}
      >
        <div
          className="relative min-h-0 overflow-hidden bg-black sm:rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center"
          style={playerStyle}
        >
          <ReelPlayer
            src={reel.video || reel.videoUrl}
            poster={reel.poster || reel.image}
            active={active}
            warm={warm}
            author={reel.author}
            caption={reel.caption}
            following={Boolean(reel.isFollowing)}
            showFollow={!isOwnReel}
            taggedProducts={reel.taggedProducts}
            designedBy={reel.designedBy}
            contentId={reel.id}
            onFollow={onFollow}
            onProfileClick={() => onProfileClick?.(reel.author)}
            onAspectChange={handleAspectChange}
          />
        </div>

        <div className="relative z-20 flex shrink-0 flex-col items-center justify-end pb-2 sm:pb-4">
          {isOwnReel ? (
            <div className="relative mb-2" ref={menuRef}>
              <button
                type="button"
                aria-label="Reel options"
                aria-expanded={menuOpen}
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen((v) => !v)
                }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition hover:bg-white/10 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
              {menuOpen ? (
                <div className="absolute bottom-11 right-0 z-30 min-w-[148px] overflow-hidden rounded-lg border border-white/15 bg-black/90 py-1 shadow-lg backdrop-blur-sm">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-red-400 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete reel'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <ReelActions
            likes={reel.likes}
            comments={reel.comments}
            liked={Boolean(reel.isLiked)}
            saved={Boolean(reel.isSaved)}
            tone="light"
            compact
            onLike={onLike}
            onSave={onSave}
            onShare={onShare}
            shareLabel={shareLabel}
            onComment={onComment}
          />
        </div>
      </div>
    </article>
  )
}
