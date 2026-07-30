import { useState } from 'react'
import ReelPlayer from './ReelPlayer'
import ReelActions from './ReelActions'
import TaggedProductsCarousel from './TaggedProductsCarousel'

/**
 * Matches mock layout:
 * [ 500×768 player ] [ actions ]
 * [ tagged products under player only ]
 */
export default function ReelCard({
  reel,
  active = false,
  onProfileClick,
}) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(false)

  return (
    <article className="mx-auto w-fit max-w-full">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="w-[min(100vw-6rem,500px)] shrink-0 sm:w-[min(100%,500px)]">
          <ReelPlayer
            src={reel.video}
            poster={reel.poster}
            active={active}
            author={reel.author}
            caption={reel.caption}
            following={following}
            onFollow={() => setFollowing((v) => !v)}
            onProfileClick={() => onProfileClick?.(reel.author)}
          />
        </div>

        <div className="shrink-0 pb-2">
          <ReelActions
            likes={reel.likes}
            comments={reel.comments}
            liked={liked}
            saved={saved}
            onLike={() => setLiked((v) => !v)}
            onSave={() => setSaved((v) => !v)}
          />
        </div>
      </div>

      <div className="mt-4 w-[min(100vw-6rem,500px)] sm:w-[min(100%,500px)]">
        <TaggedProductsCarousel
          products={reel.taggedProducts}
          designedBy={reel.designedBy}
        />
      </div>
    </article>
  )
}
