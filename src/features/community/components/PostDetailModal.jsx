import { useEffect, useState } from 'react'
import {
  communityService,
  getCommunityErrorMessage,
  mapComment,
  extractCommentsList,
} from '../../../services/community.service.js'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'

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
          </div>
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

/** Normalize post or reel card → detail media fields */
function normalizeDetail(post) {
  if (!post) return null
  const image = post.image || post.poster || ''
  const images = post.images?.length
    ? post.images
    : image
      ? [image]
      : []
  return {
    ...post,
    image,
    images,
    videoUrl: post.videoUrl || post.video || null,
    taggedProducts: post.taggedProducts ?? [],
  }
}

/**
 * Reusable post/reel detail modal — loads & posts comments via community API.
 */
export default function PostDetailModal({
  post: rawPost,
  onClose,
  onProfileClick,
}) {
  const post = normalizeDetail(rawPost)
  const [imageIndex, setImageIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentCountLabel, setCommentCountLabel] = useState(post?.comments ?? '0')

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
    setCommentError('')
    setComments([])
    setCommentCountLabel(rawPost?.comments ?? '0')
  }, [rawPost?.id, rawPost?.comments])

  useEffect(() => {
    if (!post?.id) return undefined
    let cancelled = false
    setCommentsLoading(true)
    setCommentError('')
    logCommunity('PostDetail listComments', { id: post.id })
    communityService
      .listComments(post.id, { limit: 50 })
      .then((data) => {
        if (cancelled) return
        const list = extractCommentsList(data)
          .map(mapComment)
          .filter(Boolean)
        setComments(list)
        debugLog('[Community] comments loaded', { id: post.id, count: list.length })
      })
      .catch((err) => {
        if (cancelled) return
        debugError('[Community] listComments failed', err?.message)
        setCommentError(getCommunityErrorMessage(err, 'Could not load comments.'))
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [post?.id])

  if (!post) return null

  const images = post.images
  const products = post.taggedProducts ?? []
  const canPrev = imageIndex > 0
  const canNext = imageIndex < images.length - 1
  const mediaSrc = images[imageIndex] || post.poster || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !post.id || submitting) return

    setSubmitting(true)
    setCommentError('')
    logCommunity('PostDetail addComment', { id: post.id, text })
    try {
      const created = await communityService.addComment(post.id, text)
      const mapped =
        mapComment(created?.comment || created?.data || created) ||
        mapComment({
          _id: `local-${Date.now()}`,
          text,
          authorName: 'You',
          createdAt: new Date().toISOString(),
        })
      if (mapped) {
        setComments((prev) => {
          const next = [...prev, mapped]
          setCommentCountLabel(String(next.length))
          return next
        })
      }
      setDraft('')
      debugLog('[Community] comment posted', { id: post.id })
    } catch (err) {
      debugError('[Community] addComment failed', {
        message: err?.message,
        status: err?.response?.status,
        body: err?.response?.data,
      })
      setCommentError(getCommunityErrorMessage(err, 'Could not post comment.'))
    } finally {
      setSubmitting(false)
    }
  }

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
            {post.videoUrl && !mediaSrc ? (
              <video
                src={post.videoUrl}
                poster={post.poster}
                controls
                playsInline
                className="h-full w-full object-cover"
              />
            ) : mediaSrc ? (
              <img src={mediaSrc} alt="" className="h-full w-full object-cover" />
            ) : post.videoUrl ? (
              <video
                src={post.videoUrl}
                poster={post.poster}
                controls
                playsInline
                className="h-full w-full object-cover"
              />
            ) : null}
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
                  className="cursor-pointer truncate font-inter text-sm font-semibold text-black"
                >
                  {post.author?.name || 'Member'}
                </button>
                {post.author?.role ? (
                  <span className="font-inter text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    {post.author.role}
                  </span>
                ) : null}
              </div>
              {post.author?.handle ? (
                <p className="font-inter text-xs text-neutral-400">@{post.author.handle}</p>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-2 pt-4">
            {post.caption ? (
              <p className="font-inter text-sm leading-relaxed text-neutral-800">{post.caption}</p>
            ) : null}

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
              {commentsLoading ? (
                <p className="py-4 font-inter text-xs text-neutral-400">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="py-4 font-inter text-xs text-neutral-400">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <CommentRow key={comment.id} comment={comment} />
                ))
              )}
              {commentError ? (
                <p className="mt-2 font-inter text-xs text-amber-700">{commentError}</p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-3">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-black">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span className="font-inter text-xs font-medium">{post.likes}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-black">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                <span className="font-inter text-xs font-medium">{commentCountLabel}</span>
              </span>
            </div>
            {post.date ? (
              <p className="mt-2 font-inter text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {post.date}
              </p>
            ) : null}
          </div>

          <form
            className="mt-3 flex items-center gap-2 border-t border-neutral-100 py-3"
            onSubmit={handleSubmit}
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
              disabled={submitting}
              className="min-w-0 flex-1 border-0 bg-transparent font-inter text-xs text-black outline-none placeholder:text-neutral-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!draft.trim() || submitting}
              className="cursor-pointer font-inter text-xs font-semibold text-[#2563EB] transition disabled:cursor-default disabled:opacity-40"
            >
              {submitting ? '…' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
