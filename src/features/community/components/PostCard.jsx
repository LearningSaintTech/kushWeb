const ROLE_CLASS = {
  CREATOR: 'text-neutral-400',
  DESIGNER: 'text-[#8B5CF6]',
}

export default function PostCard({
  post,
  onProfileClick,
  onOpenPost,
  onFollow,
  onLike,
  onSave,
}) {
  if (!post) return null

  const { author, image, likes, comments, caption, isLiked, isSaved } = post
  const roleClass = ROLE_CLASS[author?.role] ?? 'text-neutral-400'

  return (
    <article className="border-b border-neutral-100 pb-8 last:border-0">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onProfileClick}
          aria-label={`Open ${author.name} profile`}
          className="h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full bg-neutral-200 transition hover:opacity-80"
        >
          {author.avatar ? (
            <img src={author.avatar} alt="" className="h-full w-full object-cover" />
          ) : null}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onProfileClick}
            className="block max-w-full cursor-pointer truncate text-left font-inter text-sm font-semibold text-black transition hover:opacity-65"
          >
            {author.name}
          </button>
          <p className={`font-inter text-[10px] font-semibold uppercase tracking-[0.1em] ${roleClass}`}>
            {author.role}
          </p>
        </div>
        <button
          type="button"
          onClick={onFollow}
          className="cursor-pointer font-inter text-sm font-semibold text-[#2563EB] transition hover:opacity-80"
        >
          {author?.isFollowing ? 'Following' : 'Follow'}
        </button>
      </header>

      <button
        type="button"
        onClick={onOpenPost}
        className="mt-4 block w-full cursor-pointer overflow-hidden rounded-lg bg-neutral-100 text-left transition hover:opacity-95"
        aria-label="Open post"
      >
        {image ? (
          <img
            src={image}
            alt=""
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <div className="aspect-[4/5] w-full bg-neutral-200" />
        )}
      </button>

      <div className="mt-3 flex items-center gap-5">
        <button
          type="button"
          onClick={onLike}
          className={`inline-flex cursor-pointer items-center gap-1.5 transition hover:opacity-70 ${
            isLiked ? 'text-red-500' : 'text-black'
          }`}
          aria-pressed={Boolean(isLiked)}
        >
          <svg
            className="h-6 w-6"
            fill={isLiked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className="font-inter text-sm font-medium">{likes}</span>
        </button>
        <button
          type="button"
          onClick={onOpenPost}
          className="inline-flex cursor-pointer items-center gap-1.5 text-black transition hover:opacity-70"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span className="font-inter text-sm font-medium">{comments}</span>
        </button>
        <button type="button" className="cursor-pointer text-black transition hover:opacity-70" aria-label="Share">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`ml-auto cursor-pointer transition hover:opacity-70 ${
            isSaved ? 'text-black' : 'text-black'
          }`}
          aria-label="Save"
          aria-pressed={Boolean(isSaved)}
        >
          <svg
            className="h-6 w-6"
            fill={isSaved ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
            />
          </svg>
        </button>
      </div>

      <p className="mt-3 font-inter text-sm leading-relaxed text-neutral-800">
        <button
          type="button"
          onClick={onProfileClick}
          className="cursor-pointer font-semibold text-black transition hover:opacity-65"
        >
          {author.name}
        </button>{' '}
        {caption}
      </p>
    </article>
  )
}
