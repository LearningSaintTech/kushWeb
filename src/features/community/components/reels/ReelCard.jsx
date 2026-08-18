import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import { useAuth } from '../../../../app/context/AuthContext'
import { isSameCommunityUser } from '../../utils/userIds'

/**
 * Fullscreen Shorts card — fills the viewport; only one reel visible at a time.
 * Action stack sits outside the card on the bottom-right.
 */
export default function ReelCard({
  reel,
  active = false,
  warm = false,
  onProfileClick,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
}) {
  const { user } = useAuth()
  const isOwnReel = isSameCommunityUser(user, reel?.author)

  return (
    <article className="relative mx-auto flex h-full w-full max-w-[440px] items-stretch justify-center gap-2 sm:max-w-[460px] sm:gap-3">
      <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-black sm:rounded-2xl">
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
      </div>

      <div className="flex shrink-0 flex-col justify-end self-stretch pb-4 sm:pb-5">
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
          onComment={onComment}
        />
      </div>
    </article>
  )
}
