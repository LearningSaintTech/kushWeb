import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification, isCommunityNotification } from '../../../app/context/NotificationContext'
import { notificationService } from '../../../services/notification.service.js'
import { ROUTES } from '../../../utils/constants'
import { navigateToReel } from '../utils/openReel'
import { debugError, debugLog } from '../../../utils/debugLog.js'
import girlImg from '../../../assets/images/community/communitygirl.jpg'

const TABS = ['All', 'Activity', 'Mentions']
const PAGE_SIZE = 25

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

function NotificationIcon({ item }) {
  const templateKey = item?.templateKey || ''

  if (item?.image) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
        <img src={item.image} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  if (templateKey === 'COMMUNITY_CONTENT_LIKED') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    )
  }

  if (templateKey === 'COMMUNITY_CONTENT_COMMENTED') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.91-1.785A4.483 4.483 0 014.27 17.48C2.86 16.02 2 14.1 2 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>
    )
  }

  if (templateKey === 'COMMUNITY_PROJECT_APPROVED' || templateKey === 'COMMUNITY_DESIGNER_APPROVED') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
      <img src={girlImg} alt="" className="h-full w-full object-cover" />
    </div>
  )
}

function NotificationRow({ item, onClick }) {
  const isUnread = !item.read

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition hover:bg-neutral-50 ${
        isUnread ? 'bg-[#f3f7fe]' : 'bg-white'
      }`}
    >
      <NotificationIcon item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-inter text-xs font-semibold text-black">
            {item.title || 'Community Update'}
          </p>
          <span className="shrink-0 font-inter text-[11px] text-neutral-400">
            {formatTimeAgo(item.createdAt)}
          </span>
        </div>

        {item.body ? (
          <p className="mt-0.5 font-inter text-xs leading-relaxed text-neutral-700">
            {item.body}
          </p>
        ) : null}

        {item.referenceId ? (
          <span className="mt-1 inline-block font-inter text-[11px] font-semibold text-[#2563EB]">
            View details →
          </span>
        ) : null}
      </div>

      {isUnread ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f07a3a]" />
      ) : null}
    </button>
  )
}

function Section({ label, showRule, children }) {
  return (
    <section>
      {showRule && <div className="mx-4 mb-3 mt-4 h-px bg-neutral-100" />}
      <p className="px-4 text-left font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </p>
      <div className="mt-1 divide-y divide-neutral-50">{children}</div>
    </section>
  )
}

export default function NotificationsPanel({
  open,
  onClose,
  onOpenPost,
  onOpenProfile,
  onOpenReelComments,
}) {
  const navigate = useNavigate()
  const {
    communityList,
    communityUnreadCount,
    markRead,
    markCommunityAllRead,
    refreshUnreadCount,
  } = useNotification()

  const [tab, setTab] = useState('All')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const inFlightRef = useRef(false)

  // Sync with context community list on socket event or context updates
  useEffect(() => {
    if (communityList?.length) {
      setItems((prev) => {
        if (!prev.length) return communityList
        const existingIds = new Set(prev.map((n) => n._id || n.id))
        const prepended = communityList.filter((n) => !existingIds.has(n._id || n.id))
        return prepended.length ? [...prepended, ...prev] : prev
      })
    }
  }, [communityList])

  // Fetch initial community notifications when opened
  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await notificationService.getList({ page: 1, limit: PAGE_SIZE })
      const rawList = data?.list ?? []
      // Community-only filter: NEVER mix with order notifications
      const communityOnly = rawList.filter(isCommunityNotification)
      setItems(communityOnly)
      setPage(1)
      setHasMore(rawList.length >= PAGE_SIZE)
      refreshUnreadCount?.().catch(() => {})
      debugLog('[NotificationsPanel] community notifications load ok', { count: communityOnly.length })
    } catch (err) {
      debugError('[NotificationsPanel] load error', err?.message)
      setError('Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [refreshUnreadCount])

  useEffect(() => {
    if (!open) return undefined
    loadInitial()
  }, [open, loadInitial])

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Paginated load more
  const handleLoadMore = async () => {
    if (loadingMore || inFlightRef.current || !hasMore) return
    inFlightRef.current = true
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const data = await notificationService.getList({ page: nextPage, limit: PAGE_SIZE })
      const rawList = data?.list ?? []
      const communityOnly = rawList.filter(isCommunityNotification)

      setItems((prev) => {
        const seen = new Set(prev.map((n) => n._id || n.id))
        const unique = communityOnly.filter((n) => !seen.has(n._id || n.id))
        return [...prev, ...unique]
      })
      setPage(nextPage)
      setHasMore(rawList.length >= PAGE_SIZE)
    } catch (err) {
      debugError('[NotificationsPanel] loadMore error', err?.message)
    } finally {
      setLoadingMore(false)
      inFlightRef.current = false
    }
  }

  // Handle row tap with community-specific deep links
  const handleNotificationClick = async (item) => {
    const id = item._id || item.id
    if (!item.read && id) {
      markRead(id)
      setItems((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, read: true } : n)),
      )
    }

    onClose?.()

    const templateKey = item.templateKey || ''
    const contentType = item.metadata?.contentType
    const referenceId = item.referenceId

    // 1. Like event -> Post / Reel detail
    if (templateKey === 'COMMUNITY_CONTENT_LIKED') {
      if (referenceId) {
        if (contentType === 'reel') {
          navigateToReel(navigate, { reelId: referenceId })
        } else {
          onOpenPost?.({ id: referenceId })
        }
      }
      return
    }

    // 2. Comment event -> Comments
    if (templateKey === 'COMMUNITY_CONTENT_COMMENTED') {
      if (referenceId) {
        if (contentType === 'reel') {
          if (onOpenReelComments) {
            onOpenReelComments({ id: referenceId, type: 'reel' })
          } else {
            navigateToReel(navigate, { reelId: referenceId })
          }
        } else {
          onOpenPost?.({ id: referenceId })
        }
      }
      return
    }

    // 3. Project approved -> Designer projects / profile
    if (templateKey === 'COMMUNITY_PROJECT_APPROVED') {
      navigate(ROUTES.COMMUNITY_PROFILE)
      return
    }

    // 4. Designer verified -> Designer profile
    if (templateKey === 'COMMUNITY_DESIGNER_APPROVED') {
      navigate(ROUTES.COMMUNITY_PROFILE)
      return
    }

    // 5. Generic community fallback
    if (referenceId) {
      onOpenPost?.({ id: referenceId })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markCommunityAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      debugError('[NotificationsPanel] markCommunityAllRead error', err?.message)
    }
  }

  // Filter items by community-specific tab
  const filteredItems = useMemo(() => {
    if (tab === 'Activity') {
      return items.filter(
        (n) =>
          n.templateKey === 'COMMUNITY_CONTENT_LIKED' ||
          n.templateKey === 'COMMUNITY_PROJECT_APPROVED' ||
          n.templateKey === 'COMMUNITY_DESIGNER_APPROVED',
      )
    }
    if (tab === 'Mentions') {
      return items.filter((n) => n.templateKey === 'COMMUNITY_CONTENT_COMMENTED')
    }
    return items
  }, [items, tab])

  const today = useMemo(
    () => filteredItems.filter((n) => isToday(n.createdAt)),
    [filteredItems],
  )
  const earlier = useMemo(
    () => filteredItems.filter((n) => !isToday(n.createdAt)),
    [filteredItems],
  )

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="fixed inset-0 z-[65] cursor-default bg-black/20 backdrop-blur-[1px] lg:bg-transparent"
      />

      <aside
        className="scrollbar-hide fixed inset-y-0 left-0 z-[70] flex w-full max-w-[420px] flex-col overflow-hidden bg-white shadow-[16px_0_42px_rgba(0,0,0,0.12)] animate-[community-notifications-in_280ms_cubic-bezier(0.22,1,0.36,1)]"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-[#fbfbfb] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-inter text-lg font-bold tracking-tight text-black">
              Notifications
            </h2>
            {communityUnreadCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f07a3a] px-1.5 font-inter text-[10px] font-bold text-white">
                {communityUnreadCount > 99 ? '99+' : communityUnreadCount}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {communityUnreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="cursor-pointer font-inter text-xs font-semibold text-[#2563EB] transition hover:underline"
              >
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200 hover:text-black"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Community Tabs */}
        <div className="flex items-center gap-1.5 border-b border-neutral-100 px-4 py-2.5">
          {TABS.map((name) => {
            const active = tab === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={`cursor-pointer rounded-full px-3.5 py-1 font-inter text-xs font-semibold transition ${
                  active
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>

        {/* Content list */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pb-6">
          {loading ? (
            <div className="py-16 text-center">
              <p className="font-inter text-sm text-neutral-400">Loading notifications…</p>
            </div>
          ) : error ? (
            <div className="mx-4 mt-6 rounded-xl bg-amber-50 px-4 py-3 text-center">
              <p className="font-inter text-xs text-amber-900">{error}</p>
              <button
                type="button"
                onClick={loadInitial}
                className="mt-2 cursor-pointer font-inter text-xs font-semibold text-amber-950 underline"
              >
                Retry
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="font-inter text-sm font-medium text-black">No community notifications</p>
              <p className="mt-1 font-inter text-xs text-neutral-400">
                Likes, comments, and approvals will show up here.
              </p>
            </div>
          ) : (
            <>
              {today.length > 0 ? (
                <Section label="Today">
                  {today.map((item) => (
                    <NotificationRow
                      key={item._id || item.id}
                      item={item}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </Section>
              ) : null}

              {earlier.length > 0 ? (
                <Section label="Earlier" showRule={today.length > 0}>
                  {earlier.map((item) => (
                    <NotificationRow
                      key={item._id || item.id}
                      item={item}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </Section>
              ) : null}

              {hasMore ? (
                <div className="mt-4 flex justify-center px-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full cursor-pointer rounded-xl bg-neutral-100 py-2.5 font-inter text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more notifications'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
