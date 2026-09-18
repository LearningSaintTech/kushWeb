import { useCallback, useState } from 'react'
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
}) {
  const { user } = useAuth()
  const isOwnReel = isSameCommunityUser(user, reel?.author)

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

        <div className="relative z-20 flex shrink-0 flex-col justify-end pb-2 sm:pb-4">
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
