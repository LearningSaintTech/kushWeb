import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import TaggedProductsCarousel from './TaggedProductsCarousel'

/**
 * Fullscreen Shorts card — fills the viewport; only one reel visible at a time.
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
  const hasProducts = Array.isArray(reel.taggedProducts) && reel.taggedProducts.length > 0

  return (
    <article className="relative mx-auto flex h-full w-full max-w-[560px] items-stretch justify-center gap-2 sm:gap-4">
      <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-black sm:rounded-2xl">
        <ReelPlayer
          src={reel.video || reel.videoUrl}
          poster={reel.poster || reel.image}
          active={active}
          warm={warm}
          author={reel.author}
          caption={reel.caption}
          following={Boolean(reel.isFollowing)}
          metaOffsetClass={hasProducts ? 'bottom-[7.5rem] sm:bottom-[8.25rem]' : ''}
          onFollow={onFollow}
          onProfileClick={() => onProfileClick?.(reel.author)}
        />

        {hasProducts ? (
          <div
            data-reel-ui
            className="absolute inset-x-0 bottom-0 z-30 max-h-[42%] overflow-y-auto px-3 pb-3 pt-2 sm:px-4 sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <TaggedProductsCarousel
              products={reel.taggedProducts}
              designedBy={reel.designedBy}
              variant="dark"
              compact
            />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col justify-center self-center">
        <ReelActions
          likes={reel.likes}
          comments={reel.comments}
          liked={Boolean(reel.isLiked)}
          saved={Boolean(reel.isSaved)}
          tone="light"
          onLike={onLike}
          onSave={onSave}
          onShare={onShare}
          onComment={onComment}
        />
      </div>
    </article>
  )
}
