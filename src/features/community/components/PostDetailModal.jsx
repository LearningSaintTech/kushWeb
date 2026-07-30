import { useEffect, useState } from 'react'

function CommentRow({ comment }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-200">
        {comment.avatar ? (
          <img src={comment.avatar} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-inter text-xs">
              <span className="font-semibold text-black">{comment.name}</span>{' '}
              <span className="text-neutral-400">{comment.time}</span>
            </p>
            <p className="mt-0.5 font-inter text-xs leading-relaxed text-neutral-700">
              {comment.text}
            </p>
            <button
              type="button"
              className="mt-1.5 cursor-pointer font-inter text-xs font-medium text-neutral-400 transition hover:text-neutral-600"
            >
              Reply
            </button>
          </div>
          <button
            type="button"
            aria-label="Like comment"
            className="mt-0.5 shrink-0 cursor-pointer text-neutral-400 transition hover:text-black"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-neutral-100 p-2">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-200">
        {product.image ? (
          <img src={product.image} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-inter text-xs font-semibold text-black">{product.name}</p>
        <p className="font-inter text-[10px] text-neutral-500">{product.price}</p>
      </div>
    </div>
  )
}

/**
 * Reusable post detail modal — same for user / creator / designer feeds.
 */
export default function PostDetailModal({
  post,
  onClose,
  onProfileClick,
}) {
  const [imageIndex, setImageIndex] = useState(0)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!post) return undefined

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [post, onClose])

  useEffect(() => {
    setImageIndex(0)
    setDraft('')
  }, [post?.id])

  if (!post) return null

  const images = post.images?.length ? post.images : [post.image].filter(Boolean)
  const products = post.taggedProducts ?? []
  const comments = post.commentList ?? []
  const canPrev = imageIndex > 0
  const canNext = imageIndex < images.length - 1

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        aria-label="Close post"
        className="absolute inset-0 cursor-pointer bg-black/45"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex h-[min(82vh,640px)] w-full max-w-[1040px] overflow-hidden rounded-[1.35rem] bg-white shadow-[0_22px_80px_rgba(0,0,0,0.32)]"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Media */}
        <div className="relative hidden h-full w-[60%] shrink-0 items-center justify-center bg-white p-8 md:flex lg:p-10">
          <div className="relative h-full max-h-[560px] w-full overflow-hidden bg-neutral-100">
            <img
              src={images[imageIndex]}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          {canPrev ? (
            <button
              type="button"
              onClick={() => setImageIndex((i) => i - 1)}
              aria-label="Previous image"
              className="absolute left-12 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : null}

          {canNext ? (
            <button
              type="button"
              onClick={() => setImageIndex((i) => i + 1)}
              aria-label="Next image"
              className="absolute right-12 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Details */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-8 pt-8">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
            <button
              type="button"
              onClick={() => onProfileClick?.(post.author)}
              className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full bg-neutral-200"
            >
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
              ) : null}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <button
                  type="button"
                  onClick={() => onProfileClick?.(post.author)}
                  className="cursor-pointer truncate font-inter text-xs font-semibold text-black hover:opacity-70"
                >
                  {post.author?.name}
                </button>
                <span className="font-inter text-[8px] font-semibold uppercase tracking-[0.12em] text-[#2563EB]">
                  {post.author?.role}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="cursor-pointer pr-6 font-inter text-xs font-semibold text-black transition hover:opacity-70"
            >
              Follow
            </button>
          </div>

          {/* Mobile media */}
          <div className="relative aspect-[4/5] w-full bg-neutral-100 md:hidden">
            <img src={images[imageIndex]} alt="" className="h-full w-full object-cover" />
            {canNext ? (
              <button
                type="button"
                onClick={() => setImageIndex((i) => i + 1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto py-4">
            <p className="font-inter text-xs leading-relaxed text-neutral-800">
              {post.caption}
            </p>

            {products.length ? (
              <div className="mt-3 pt-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-inter text-[11px] font-medium text-neutral-500">Tagged Products</p>
                  {post.designedBy ? (
                    <p className="font-inter text-[10px] text-neutral-500">
                      Designed by{' '}
                      <span className="font-semibold text-black">{post.designedBy}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 border-t border-neutral-100 pt-4">
              {comments.map((comment) => (
                <CommentRow key={comment.id} comment={comment} />
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-3">
            <div className="flex items-center gap-4">
              <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-black transition hover:opacity-70">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span className="font-inter text-xs font-medium">{post.likes}</span>
              </button>
              <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 text-black transition hover:opacity-70">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                <span className="font-inter text-xs font-medium">{post.comments}</span>
              </button>
              <button type="button" className="cursor-pointer text-black transition hover:opacity-70" aria-label="Share">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
              <button type="button" className="ml-auto cursor-pointer text-black transition hover:opacity-70" aria-label="Save">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </button>
            </div>
            {post.date ? (
              <p className="mt-2 font-inter text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {post.date}
              </p>
            ) : null}
          </div>

          <form
            className="mt-3 flex items-center gap-2 border-t border-neutral-100 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              setDraft('')
            }}
          >
            <span className="text-neutral-400" aria-hidden>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment..."
              className="min-w-0 flex-1 border-0 bg-transparent font-inter text-xs text-black outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="cursor-pointer font-inter text-xs font-semibold text-[#2563EB] transition disabled:cursor-default disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
