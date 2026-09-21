import { useEffect, useRef, useState } from 'react'
import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import { useAuth } from '../../../../app/context/AuthContext'
import { isSameCommunityUser } from '../../utils/userIds'

/**
 * Same 9:16 player for every reel. Landscape/square video letterboxes inside;
 * chrome (name, follow, actions) stays on that frame.
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

  return (
    <article className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-1.5 sm:p-3">
      <div className="community-reel-fit h-full w-full min-h-0 min-w-0">
        <div
          className="community-reel-frame relative overflow-hidden bg-black sm:rounded-2xl shadow-2xl"
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
          />

          <div
            className="pointer-events-none absolute inset-y-0 right-1 z-30 flex items-end pb-[5.5rem] sm:right-2"
            ref={menuRef}
          >
            <div className="pointer-events-auto flex flex-col items-center">
              {isOwnReel ? (
                <div className="relative mb-1.5">
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
        </div>
      </div>
    </article>
  )
}
