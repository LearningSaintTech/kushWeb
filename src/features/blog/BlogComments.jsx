import { useCallback, useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { blogService } from '../../services/blog.service.js'
import { useAuth } from '../../app/context/AuthContext'

const MAX_COMMENT_LENGTH = 1000

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CommentForm({ placeholder, submitLabel, onSubmit, onCancel, autoFocus }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(value)
      setText('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Your comment could not be posted. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_COMMENT_LENGTH}
        rows={3}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="w-full resize-y rounded border border-gray-300 p-3 text-sm outline-none focus:border-black"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="cursor-pointer bg-black px-5 py-2 font-inter text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Posting…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="cursor-pointer px-3 py-2 text-sm text-gray-600 hover:text-black">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function Comment({ comment, currentUserId, onLike, onDelete, onReply, isReply = false }) {
  const [replying, setReplying] = useState(false)
  const initial = (comment.user?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className={isReply ? 'mt-4 border-l border-gray-200 pl-4' : 'border-b border-gray-100 py-5'}>
      <div className="flex items-start gap-3">
        {comment.user?.avatar ? (
          <img src={comment.user.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold text-black">{comment.user?.name || 'User'}</span>
            <span className="ml-2 text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{comment.text}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <button
              type="button"
              onClick={() => onLike(comment)}
              aria-pressed={Boolean(comment.likedByMe)}
              className="inline-flex cursor-pointer items-center gap-1 hover:text-black"
            >
              <Heart className={`h-3.5 w-3.5 ${comment.likedByMe ? 'fill-black text-black' : ''}`} aria-hidden="true" />
              {comment.likeCount || 0}
            </button>
            {!isReply && (
              <button type="button" onClick={() => setReplying((v) => !v)} className="cursor-pointer hover:text-black">
                Reply
              </button>
            )}
            {currentUserId && String(comment.user?.id) === String(currentUserId) && (
              <button type="button" onClick={() => onDelete(comment)} className="cursor-pointer hover:text-red-600">
                Delete
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-3">
              <CommentForm
                placeholder="Write a reply"
                submitLabel="Reply"
                autoFocus
                onCancel={() => setReplying(false)}
                onSubmit={async (text) => {
                  await onReply(comment, text)
                  setReplying(false)
                }}
              />
            </div>
          )}

          {(comment.replies || []).map((reply) => (
            <Comment key={reply.id} comment={reply} currentUserId={currentUserId} onLike={onLike} onDelete={onDelete} isReply />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Comments under a post: anyone can read; posting, replying and liking need a login. */
export default function BlogComments({ blogId, onCountChange, onLoginRequired }) {
  const { isAuthenticated, user } = useAuth()
  const currentUserId = user?._id || user?.id || user?.userId || null
  const [comments, setComments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (page = 1) => {
      const result = await blogService.getComments(blogId, { page, limit: 20 })
      setComments((current) => (page === 1 ? result.comments : [...current, ...result.comments]))
      setPagination(result.pagination)
    },
    [blogId],
  )

  useEffect(() => {
    setLoading(true)
    load(1)
      .catch(() => setError('Comments could not be loaded.'))
      .finally(() => setLoading(false))
  }, [load])

  const updateComment = (id, patch) =>
    setComments((list) =>
      list.map((c) =>
        c.id === id
          ? { ...c, ...patch }
          : { ...c, replies: (c.replies || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) },
      ),
    )

  const like = async (comment) => {
    if (!isAuthenticated) {
      onLoginRequired()
      return
    }
    try {
      const { liked, likeCount } = await blogService.toggleCommentLike(comment.id)
      updateComment(comment.id, { likedByMe: liked, likeCount })
    } catch {
      // Leave the count as it was
    }
  }

  const add = async (text) => {
    const created = await blogService.addComment(blogId, { text })
    setComments((list) => [{ ...created, replies: [] }, ...list])
    onCountChange?.(1)
  }

  const reply = async (parent, text) => {
    if (!isAuthenticated) {
      onLoginRequired()
      return
    }
    const created = await blogService.addComment(blogId, { text, parentId: parent.id })
    updateComment(parent.id, { replies: [...(parent.replies || []), created] })
    onCountChange?.(1)
  }

  const remove = async (comment) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await blogService.deleteComment(comment.id)
      setComments((list) =>
        list
          .filter((c) => c.id !== comment.id)
          .map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== comment.id) })),
      )
      onCountChange?.(-(1 + (comment.replies?.length || 0)))
    } catch {
      setError('That comment could not be deleted. Please try again.')
    }
  }

  const hasMore = pagination && pagination.page < pagination.totalPages

  return (
    <section className="mt-10" aria-labelledby="blog-comments">
      <h2 id="blog-comments" className="font-inter text-xl font-bold text-black">
        Comments{pagination?.total ? ` (${pagination.total})` : ''}
      </h2>

      <div className="mt-4">
        {isAuthenticated ? (
          <CommentForm placeholder="Share your thoughts" submitLabel="Post comment" onSubmit={add} />
        ) : (
          <button
            type="button"
            onClick={onLoginRequired}
            className="cursor-pointer border border-black px-5 py-2 font-inter text-sm font-semibold transition-colors hover:bg-black hover:text-white"
          >
            Log in to comment
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        !error && <p className="mt-6 text-sm text-gray-500">No comments yet. Be the first.</p>
      ) : (
        <div className="mt-4">
          {comments.map((comment) => (
            <Comment key={comment.id} comment={comment} currentUserId={currentUserId} onLike={like} onDelete={remove} onReply={reply} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => load((pagination?.page || 1) + 1).catch(() => setError('More comments could not be loaded.'))}
          className="mt-4 cursor-pointer text-sm font-semibold underline"
        >
          Show more comments
        </button>
      )}
    </section>
  )
}
