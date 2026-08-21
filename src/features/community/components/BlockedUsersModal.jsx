import { useCallback, useEffect, useState } from 'react'
import {
  communityService,
  getCommunityErrorMessage,
} from '../../../services/community.service.js'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import {
  COMMUNITY_USER_UNBLOCKED_EVENT,
  dispatchUserUnblocked,
} from '../utils/moderation'

function mapBlockedRow(row) {
  if (!row) return null
  const user = row.user || row.blockedUser || row
  const id = user.userId || user._id || user.id || row.blockedId || row.userId
  if (!id) return null
  return {
    id: String(id),
    name: user.fullName || user.name || user.username || 'Member',
    handle: String(user.username || '').replace(/^@/, ''),
    avatar: user.profileImage || user.avatar || '',
  }
}

/**
 * Lists blocked users — GET /community/block — with Unblock actions.
 */
export default function BlockedUsersModal({ open, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async ({ append = false, nextCursor = null } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const data = await communityService.listBlockedUsers({
        limit: 20,
        ...(nextCursor ? { cursor: nextCursor } : {}),
      })
      const raw = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : []
      const mapped = raw.map(mapBlockedRow).filter(Boolean)
      setItems((prev) => (append ? [...prev, ...mapped] : mapped))
      const next = data?.nextCursor || data?.cursor || null
      setCursor(next)
      setHasMore(Boolean(data?.hasMore || next))
      debugLog('[Community] blocked list', { count: mapped.length })
    } catch (err) {
      debugError('[Community] listBlockedUsers failed', err?.message)
      setError(getCommunityErrorMessage(err, 'Could not load blocked users.'))
      if (!append) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setItems([])
    setCursor(null)
    load({ append: false })
  }, [open, load])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleUnblock = async (userId) => {
    if (!userId || busyId) return
    setBusyId(userId)
    try {
      await communityService.unblockUser(userId)
      setItems((prev) => prev.filter((u) => String(u.id) !== String(userId)))
      dispatchUserUnblocked({ userId })
      window.dispatchEvent(
        new CustomEvent(COMMUNITY_USER_UNBLOCKED_EVENT, {
          detail: { userId: String(userId) },
        }),
      )
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not unblock user.'))
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-users-title"
        className="relative z-10 flex max-h-[min(80vh,560px)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2
            id="blocked-users-title"
            className="font-inter text-lg font-bold text-black"
          >
            Blocked accounts
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-3 py-10 text-center font-inter text-xs text-neutral-400">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-10 text-center font-inter text-xs text-neutral-400">
              No blocked accounts
            </p>
          ) : (
            <ul>
              {items.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-inter text-sm font-semibold text-black">
                      {person.name}
                    </p>
                    {person.handle ? (
                      <p className="truncate font-inter text-xs text-neutral-400">
                        @{person.handle}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === person.id}
                    onClick={() => handleUnblock(person.id)}
                    className="cursor-pointer rounded-full border border-neutral-200 px-3 py-1.5 font-inter text-xs font-semibold text-black transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {busyId === person.id ? '…' : 'Unblock'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => load({ append: true, nextCursor: cursor })}
              className="mx-3 mb-2 w-[calc(100%-1.5rem)] cursor-pointer rounded-xl py-2 font-inter text-xs font-semibold text-[#2563EB] transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="border-t border-neutral-100 px-5 py-3 font-inter text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
