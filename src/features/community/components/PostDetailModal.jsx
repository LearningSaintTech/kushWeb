import { useEffect, useRef, useState } from 'react'
import {
  communityService,
  getCommunityErrorMessage,
  mapComment,
  mapContentToPost,
  extractCommentsList,
} from '../../../services/community.service.js'
import { logCommunity } from '../../../services/communityApi.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import { useAuth } from '../../../app/context/AuthContext'
import { isSameCommunityUser } from '../utils/userIds'
import ReportReasonModal from './ReportReasonModal'
import {
  dispatchContentReported,
  dispatchUserBlocked,
  dispatchUserUnblocked,
  resolveCanBlock,
  resolveCanReport,
} from '../utils/moderation'

const TAGGED_PRODUCTS_LIMIT = 10

function CommentRow({
  comment,
  isOwn,
  busy = false,
  onBlock,
  onUnblock,
  onReport,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const canBlock = resolveCanBlock(comment, isOwn)
  const canReport = resolveCanReport(comment, isOwn)
  const showMenu = !isOwn && (canBlock || canReport)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

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
          {showMenu ? (
            <div className="relative shrink-0" ref={ref}>
              <button
                type="button"
                aria-label="Comment options"
                aria-expanded={open}
                disabled={busy}
                onClick={() => setOpen((v) => !v)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-black disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </button>
              {open ? (
                <div className="absolute right-0 top-8 z-30 min-w-[148px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {canBlock ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setOpen(false)
                        if (comment.isBlocked) onUnblock?.(comment)
                        else onBlock?.(comment)
                      }}
                      className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {comment.isBlocked ? 'Unblock user' : 'Block user'}
                    </button>
                  ) : null}
                  {canReport ? (
                    <button
                      type="button"
                      disabled={busy || comment.isReported}
                      onClick={() => {
                        setOpen(false)
                        onReport?.(comment)
                      }}
                      className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {comment.isReported ? 'Reported' : 'Report comment'}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
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
 * Reusable post/reel detail modal — loads content detail + comments via community API.
 */
export default function PostDetailModal({
  post: rawPost,
  onClose,
  onProfileClick,
  onDeleted,
}) {
  const { user } = useAuth()
  const [detailPost, setDetailPost] = useState(() => normalizeDetail(rawPost))
  const [detailLoading, setDetailLoading] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentCountLabel, setCommentCountLabel] = useState(rawPost?.comments ?? '0')
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moderationBusy, setModerationBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [reportTarget, setReportTarget] = useState(null) // { type: 'content'|'comment', id }
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const menuRef = useRef(null)

  const post = detailPost
  const isOwnPost = Boolean(post) && isSameCommunityUser(user, post?.author)
  const canBlockPost = Boolean(post) && resolveCanBlock(post, isOwnPost)
  const canReportPost = Boolean(post) && resolveCanReport(post, isOwnPost)
  const showPostMenu = Boolean(post) && (isOwnPost || canBlockPost || canReportPost)

  useEffect(() => {
    setDetailPost(normalizeDetail(rawPost))
    setImageIndex(0)
    setDraft('')
    setCommentError('')
    setActionError('')
    setActionSuccess('')
    setMenuOpen(false)
    setReportTarget(null)
    setReportError('')
    setComments([])
    setCommentCountLabel(rawPost?.comments ?? '0')
  }, [rawPost?.id, rawPost?.comments])

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

  // GET /community/content/:id — full detail + tagged products (up to 10)
  useEffect(() => {
    const id = rawPost?.id || rawPost?._id
    if (!id) return undefined
    let cancelled = false
    setDetailLoading(true)
    logCommunity('PostDetail getContent', { id })
    communityService
      .getContent(id, { taggedLimit: TAGGED_PRODUCTS_LIMIT, limit: TAGGED_PRODUCTS_LIMIT })
      .then((data) => {
        if (cancelled) return
        const mapped = mapContentToPost(data)
        if (!mapped) return
        const tagged = (mapped.taggedProducts || []).slice(0, TAGGED_PRODUCTS_LIMIT)
        setDetailPost(normalizeDetail({ ...mapped, taggedProducts: tagged }))
        setCommentCountLabel(mapped.comments ?? String(mapped.commentCount || 0))
        debugLog('[Community] content detail loaded', {
          id,
          taggedCount: tagged.length,
          status: mapped.status,
        })
      })
      .catch((err) => {
        if (cancelled) return
        debugError('[Community] getContent failed', err?.message)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [rawPost?.id, rawPost?._id])

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

  const handleDelete = async () => {
    if (!post?.id || deleting || !isOwnPost) return
    const ok = window.confirm('Delete this post? This cannot be undone.')
    if (!ok) return
    setDeleting(true)
    setActionError('')
    setMenuOpen(false)
    logCommunity('PostDetail deleteContent', { id: post.id })
    try {
      await communityService.deleteContent(post.id)
      debugLog('[Community] content deleted', { id: post.id })
      onDeleted?.(post.id)
      onClose?.()
    } catch (err) {
      debugError('[Community] deleteContent failed', err?.message)
      setActionError(getCommunityErrorMessage(err, 'Could not delete post.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleBlockAuthor = async () => {
    if (!post?.id || moderationBusy || isOwnPost) return
    const ok = window.confirm(
      `Block ${post.author?.name || 'this user'}? Their posts will leave your feed.`,
    )
    if (!ok) return
    setModerationBusy(true)
    setActionError('')
    setMenuOpen(false)
    try {
      const data = await communityService.blockContentAuthor(post.id)
      const blockedId = data?.blockedId || post.author?.id
      setDetailPost((prev) =>
        prev
          ? {
              ...prev,
              isBlocked: true,
              author: prev.author
                ? { ...prev.author, isFollowing: false }
                : prev.author,
            }
          : prev,
      )
      dispatchUserBlocked({ userId: blockedId, contentId: post.id })
      setActionSuccess('User blocked')
      debugLog('[Community] content author blocked', { id: post.id, blockedId })
      window.setTimeout(() => onClose?.(), 600)
    } catch (err) {
      setActionError(getCommunityErrorMessage(err, 'Could not block user.'))
    } finally {
      setModerationBusy(false)
    }
  }

  const handleUnblockAuthor = async () => {
    if (!post?.id || moderationBusy) return
    setModerationBusy(true)
    setActionError('')
    setMenuOpen(false)
    try {
      const data = await communityService.unblockContentAuthor(post.id)
      const blockedId = data?.blockedId || post.author?.id
      setDetailPost((prev) => (prev ? { ...prev, isBlocked: false } : prev))
      dispatchUserUnblocked({ userId: blockedId, contentId: post.id })
      setActionSuccess('User unblocked')
    } catch (err) {
      setActionError(getCommunityErrorMessage(err, 'Could not unblock user.'))
    } finally {
      setModerationBusy(false)
    }
  }

  const handleBlockComment = async (comment) => {
    if (!comment?.id || moderationBusy) return
    const ok = window.confirm(`Block ${comment.name || 'this user'}?`)
    if (!ok) return
    setModerationBusy(true)
    setActionError('')
    try {
      const data = await communityService.blockCommentAuthor(comment.id)
      const blockedId = data?.blockedId || comment.authorId
      setComments((prev) =>
        prev.filter((c) => {
          if (String(c.id) === String(comment.id)) return false
          if (blockedId && String(c.authorId) === String(blockedId)) return false
          return true
        }),
      )
      dispatchUserBlocked({
        userId: blockedId,
        commentId: comment.id,
        contentId: post?.id,
      })
      setActionSuccess('User blocked')
      window.setTimeout(() => onClose?.(), 600)
    } catch (err) {
      setActionError(getCommunityErrorMessage(err, 'Could not block user.'))
    } finally {
      setModerationBusy(false)
    }
  }

  const handleUnblockComment = async (comment) => {
    if (!comment?.id || moderationBusy) return
    setModerationBusy(true)
    setActionError('')
    try {
      const data = await communityService.unblockCommentAuthor(comment.id)
      const blockedId = data?.blockedId || comment.authorId
      setComments((prev) =>
        prev.map((c) =>
          String(c.id) === String(comment.id)
            ? { ...c, isBlocked: false }
            : c,
        ),
      )
      dispatchUserUnblocked({
        userId: blockedId,
        commentId: comment.id,
        contentId: post?.id,
      })
      setActionSuccess('User unblocked')
    } catch (err) {
      setActionError(getCommunityErrorMessage(err, 'Could not unblock user.'))
    } finally {
      setModerationBusy(false)
    }
  }

  const openReportContent = () => {
    setMenuOpen(false)
    setReportError('')
    setReportTarget({ type: 'content', id: post.id })
  }

  const openReportComment = (comment) => {
    setReportError('')
    setReportTarget({ type: 'comment', id: comment.id })
  }

  const handleReportSubmit = async ({ reason, details }) => {
    if (!reportTarget?.id || reportSubmitting) return
    setReportSubmitting(true)
    setReportError('')
    try {
      let result
      if (reportTarget.type === 'comment') {
        result = await communityService.reportComment(reportTarget.id, {
          reason,
          details,
        })
        setComments((prev) =>
          prev.map((c) =>
            String(c.id) === String(reportTarget.id)
              ? { ...c, isReported: true }
              : c,
          ),
        )
      } else {
        result = await communityService.reportContent(reportTarget.id, {
          reason,
          details,
        })
        setDetailPost((prev) => (prev ? { ...prev, isReported: true } : prev))
      }
      dispatchContentReported({
        contentId: reportTarget.type === 'content' ? reportTarget.id : post?.id,
        commentId: reportTarget.type === 'comment' ? reportTarget.id : null,
      })
      const already = Boolean(result?.alreadyReported)
      setActionSuccess(already ? 'Already reported' : 'Report submitted')
      setReportTarget(null)
      debugLog('[Community] report ok', { ...reportTarget, already })
    } catch (err) {
      setReportError(getCommunityErrorMessage(err, 'Could not submit report.'))
    } finally {
      setReportSubmitting(false)
    }
  }

  if (!post) return null

  const images = post.images?.length ? post.images : post.image ? [post.image] : []
  const mediaSrc = images[imageIndex] || post.poster || ''
  const canPrev = imageIndex > 0
  const canNext = imageIndex < images.length - 1
  const products = (post.taggedProducts || []).slice(0, TAGGED_PRODUCTS_LIMIT)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 lg:p-6">
      <button
        type="button"
        aria-label="Close post"
        className="absolute inset-0 cursor-pointer bg-black/45"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-[980px] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_22px_80px_rgba(0,0,0,0.32)] md:h-[min(86vh,640px)]"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 md:right-4 md:top-4"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Media — contain so the full post is visible */}
        <div className="relative hidden h-full w-[55%] shrink-0 items-center justify-center bg-[#111] md:flex">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {post.videoUrl && !mediaSrc ? (
              <video
                src={post.videoUrl}
                poster={post.poster}
                controls
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            ) : mediaSrc ? (
              <img
                src={mediaSrc}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            ) : post.videoUrl ? (
              <video
                src={post.videoUrl}
                poster={post.poster}
                controls
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
          </div>

          {canPrev ? (
            <button
              type="button"
              onClick={() => setImageIndex((i) => i - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
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
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-4 sm:px-5 sm:pt-5 md:pr-10 md:pt-6">
          {/* Mobile media */}
          <div className="relative mb-3 aspect-[4/5] max-h-[42vh] w-full overflow-hidden rounded-xl bg-[#111] md:hidden">
            {post.videoUrl && !mediaSrc ? (
              <video
                src={post.videoUrl}
                poster={post.poster}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : mediaSrc ? (
              <img src={mediaSrc} alt="" className="h-full w-full object-contain" />
            ) : null}
            {canPrev ? (
              <button
                type="button"
                onClick={() => setImageIndex((i) => i - 1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            ) : null}
            {canNext ? (
              <button
                type="button"
                onClick={() => setImageIndex((i) => i + 1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 pb-3">
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

            {showPostMenu ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Post options"
                  aria-expanded={menuOpen}
                  disabled={deleting || moderationBusy}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="mr-8 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-black transition hover:bg-neutral-100 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="5" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="19" cy="12" r="1.6" />
                  </svg>
                </button>
                {menuOpen ? (
                  <div className="absolute right-8 top-9 z-30 min-w-[156px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                    {isOwnPost ? (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDelete}
                        className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Delete post'}
                      </button>
                    ) : (
                      <>
                        {canBlockPost ? (
                          <button
                            type="button"
                            disabled={moderationBusy}
                            onClick={() =>
                              post.isBlocked
                                ? handleUnblockAuthor()
                                : handleBlockAuthor()
                            }
                            className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                          >
                            {post.isBlocked ? 'Unblock user' : 'Block user'}
                          </button>
                        ) : null}
                        {canReportPost ? (
                          <button
                            type="button"
                            disabled={moderationBusy || post.isReported}
                            onClick={openReportContent}
                            className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left font-inter text-xs font-semibold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                          >
                            {post.isReported ? 'Reported' : 'Report post'}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {actionError ? (
            <p className="mt-2 shrink-0 font-inter text-xs text-red-600">{actionError}</p>
          ) : null}
          {actionSuccess ? (
            <p className="mt-2 shrink-0 font-inter text-xs text-emerald-700">{actionSuccess}</p>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3">
            <div className="shrink-0 space-y-3">
              {detailLoading && !post.caption ? (
                <p className="font-inter text-xs text-neutral-400">Loading post…</p>
              ) : null}
              {post.caption ? (
                <p className="font-inter text-sm leading-relaxed text-neutral-800">{post.caption}</p>
              ) : null}

              {products.length ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-inter text-[11px] font-medium text-neutral-500">
                      Tagged Products
                      {products.length > 1 ? (
                        <span className="text-neutral-400"> · {products.length}</span>
                      ) : null}
                    </p>
                    {post.designedBy ? (
                      <p className="font-inter text-[10px] text-neutral-500">
                        Designed by{' '}
                        <span className="font-semibold text-black">{post.designedBy}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
                    {products.map((product) => (
                      <div key={product.id} className="min-w-[46%] max-w-[52%] shrink-0 sm:min-w-[42%]">
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : detailLoading ? (
                <p className="font-inter text-[11px] text-neutral-400">Loading products…</p>
              ) : null}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-neutral-100 pt-3">
              {commentsLoading ? (
                <p className="py-2 font-inter text-xs text-neutral-400">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="py-2 font-inter text-xs text-neutral-400">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    isOwn={isSameCommunityUser(user, comment.authorId || comment)}
                    busy={moderationBusy}
                    onBlock={handleBlockComment}
                    onUnblock={handleUnblockComment}
                    onReport={openReportComment}
                  />
                ))
              )}
              {commentError ? (
                <p className="mt-2 font-inter text-xs text-amber-700">{commentError}</p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-neutral-100 pt-3">
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
              <p className="mt-1.5 font-inter text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {post.date}
              </p>
            ) : null}
          </div>

          <form
            className="mt-2 flex shrink-0 items-center gap-2 border-t border-neutral-100 py-3"
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

      <ReportReasonModal
        open={Boolean(reportTarget)}
        title={
          reportTarget?.type === 'comment' ? 'Report comment' : 'Report post'
        }
        submitting={reportSubmitting}
        error={reportError}
        onClose={() => !reportSubmitting && setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />
    </div>
  )
}
