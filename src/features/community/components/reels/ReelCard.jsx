import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import TaggedProductsCarousel from './TaggedProductsCarousel'

/**
 * Immersive reel — large on laptop + desktop (not height-starved on short screens).
 * [ tall 9:16 player ] [ actions ]
 * [ tagged products under player ]
 */
const REEL_WIDTH =
  'w-[min(100%,calc(100vw-5rem))] sm:w-[min(400px,calc(100vw-5.5rem))] md:w-[min(440px,calc(100vw-7rem))] lg:w-[460px] xl:w-[480px]'

export default function ReelCard({
  reel,
  active = false,
  onProfileClick,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
}) {
  return (
    <article className="mx-auto w-fit max-w-full">
      <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
        <div className={`aspect-[9/16] shrink-0 ${REEL_WIDTH}`}>
          <ReelPlayer
            src={reel.video}
            poster={reel.poster}
            active={active}
            author={reel.author}
            caption={reel.caption}
            following={Boolean(reel.isFollowing)}
            onFollow={onFollow}
            onProfileClick={() => onProfileClick?.(reel.author)}
          />
        </div>

        <div className="shrink-0 self-center pb-2">
          <ReelActions
            likes={reel.likes}
            comments={reel.comments}
            liked={Boolean(reel.isLiked)}
            saved={Boolean(reel.isSaved)}
            onLike={onLike}
            onSave={onSave}
            onShare={onShare}
            onComment={onComment}
          />
        </div>
      </div>

      <div className={`mt-4 ${REEL_WIDTH}`}>
        <TaggedProductsCarousel
          products={reel.taggedProducts}
          designedBy={reel.designedBy}
        />
      </div>
    </article>
  )
}
