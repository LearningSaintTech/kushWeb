import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/context/AuthContext'
import { supportTicketService } from '../../services/supportTicket.service.js'
import botAvatar from '../../assets/temporary/Avatar.svg'
import {
  ACTIVE_STATUSES,
  ISSUE_TYPES,
  MAX_CHAT_IMAGES,
  MAX_CHAT_VIDEOS,
  ORDER_LINKED_ISSUES,
  formatChatTime,
  isAllowedChatMediaFile,
  isVideoFile,
  revokeObjectUrls,
  statusLabel,
} from './supportShared'
import SafeExternalLink from '../../shared/components/SafeExternalLink.jsx'
import { getSafeHttpHref } from '../../utils/safeUrl.util.js'

const STARTER =
  "Hi! Tell us how we can help, or start a support request and our team will reply here."

function SendIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function AttachIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
      />
    </svg>
  )
}

function collectMessageMedia(message) {
  const images = [...(message?.images || [])]
  const videos = [...(message?.videos || [])]
  for (const row of message?.attachments || []) {
    if (!row?.url) continue
    const type = String(row.type || '').toLowerCase()
    if (type.startsWith('video/')) videos.push(row)
    else images.push(row)
  }
  return { images, videos }
}

function MessageMedia({ message }) {
  const { images, videos } = collectMessageMedia(message)
  if (!images.length && !videos.length) return null

  return (
    <div className="mt-2 space-y-2">
      {images.map((item, index) => {
        const safeSrc = getSafeHttpHref(item?.url)
        if (!safeSrc) return null
        return (
          <SafeExternalLink key={`img-${index}`} href={safeSrc}>
            <img
              src={safeSrc}
              alt=""
              className="max-h-48 w-full rounded-lg object-cover"
              loading="lazy"
            />
          </SafeExternalLink>
        )
      })}
      {videos.map((item, index) => {
        const safeSrc = getSafeHttpHref(item?.url)
        if (!safeSrc) return null
        return (
          <video
            key={`vid-${index}`}
            src={safeSrc}
            controls
            playsInline
            preload="metadata"
            className="max-h-48 w-full rounded-lg bg-black/10"
          />
        )
      })}
    </div>
  )
}

function MediaPreviewStrip({ items, onRemove, disabled }) {
  if (!items.length) return null

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map((item, index) => (
        <div key={`${item.file.name}-${index}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          {item.kind === 'video' ? (
            <video src={item.url} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(index)}
            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white disabled:opacity-50"
            aria-label="Remove attachment"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function TicketMediaBlock({ images = [], videos = [] }) {
  if (!images.length && !videos.length) return null

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Attached proof</p>
      <div className="flex flex-wrap gap-2">
        {images.map((item, index) => {
          const safeSrc = getSafeHttpHref(item?.url)
          if (!safeSrc) return null
          return (
            <SafeExternalLink
              key={`ticket-img-${index}`}
              href={safeSrc}
              className="block h-20 w-20 overflow-hidden rounded-lg border border-zinc-200"
            >
              <img src={safeSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
            </SafeExternalLink>
          )
        })}
        {videos.map((item, index) => {
          const safeSrc = getSafeHttpHref(item?.url)
          if (!safeSrc) return null
          return (
            <video
              key={`ticket-vid-${index}`}
              src={safeSrc}
              controls
              playsInline
              preload="metadata"
              className="h-20 w-32 rounded-lg border border-zinc-200 bg-black/5 object-cover"
            />
          )
        })}
      </div>
    </div>
  )
}

function ticketMatchesContext(ticket, ctx) {
  if (!ctx?.itemId || !ticket) return false
  const ticketItemId = ticket.itemId?._id || ticket.itemId
  if (String(ticketItemId) !== String(ctx.itemId)) return false
  if (ctx.orderId || ctx.orderCode) {
    const orderRef = ticket.orderId?._id || ticket.order?._id || ticket.orderId
    const orderCode = ticket.order?.orderId || ticket.orderCode
    const orderMatch =
      (ctx.orderId && String(orderRef) === String(ctx.orderId)) ||
      (ctx.orderCode && orderCode && String(orderCode) === String(ctx.orderCode))
    if (!orderMatch) return false
  }
  return String(ticket.status || '').toUpperCase() !== 'CLOSED'
}

export default function SupportChat({
  variant = 'modal',
  open = true,
  onClose,
  initialContext = null,
}) {
  const { isAuthenticated, authChecked, openAuthModal } = useAuth()
  const [view, setView] = useState('loading')
  const [tickets, setTickets] = useState([])
  const [activeTicket, setActiveTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [raiseForm, setRaiseForm] = useState({
    issueType: 'OTHER',
    subject: '',
    description: '',
    orderMongoId: '',
    itemId: '',
  })
  const [orderItems, setOrderItems] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  /** @type {{ file: File, url: string, kind: 'image' | 'video' }[]} */
  const [pendingMedia, setPendingMedia] = useState([])
  /** @type {{ file: File, url: string, kind: 'image' | 'video' }[]} */
  const [raiseMedia, setRaiseMedia] = useState([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const scrollRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const raiseImageInputRef = useRef(null)
  const raiseVideoInputRef = useRef(null)
  const pendingMediaRef = useRef(pendingMedia)
  const raiseMediaRef = useRef(raiseMedia)

  const pendingImageCount = pendingMedia.filter((m) => m.kind === 'image').length
  const pendingVideoCount = pendingMedia.filter((m) => m.kind === 'video').length
  const raiseImageCount = raiseMedia.filter((m) => m.kind === 'image').length
  const raiseVideoCount = raiseMedia.filter((m) => m.kind === 'video').length

  const isModal = variant === 'modal'
  const canSend = (input.trim().length > 0 || pendingMedia.length > 0) && !sending
  const isTerminal = activeTicket && ['CLOSED'].includes(String(activeTicket.status || '').toUpperCase())
  const needsOrderLink = ORDER_LINKED_ISSUES.has(raiseForm.issueType)

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  const loadTickets = useCallback(async () => {
    const data = await supportTicketService.listTickets({ limit: 30 })
    const list = data?.tickets || []
    setTickets(list)
    const active = list.find((t) => ACTIVE_STATUSES.has(String(t.status || '').toUpperCase()) && t.status !== 'RESOLVED')
    return { list, active }
  }, [])

  const loadMessages = useCallback(async (ticketId) => {
    const data = await supportTicketService.getMessages(ticketId, { limit: 100 })
    setMessages(data?.messages || [])
  }, [])

  const openTicket = useCallback(
    async (ticket) => {
      setError('')
      setActiveTicket(ticket)
      setView('chat')
      await loadMessages(ticket._id)
    },
    [loadMessages],
  )

  useEffect(() => {
    if (isModal && !open) return
    if (!authChecked) return
    if (!isAuthenticated) {
      setView('login')
      return
    }

    let cancelled = false
    ;(async () => {
      setView('loading')
      setError('')
      try {
        const { list, active } = await loadTickets()
        if (cancelled) return

        const related = initialContext
          ? list.find((t) => ticketMatchesContext(t, initialContext))
          : null

        if (related) {
          setActiveTicket(related)
          setView('chat')
          await loadMessages(related._id)
          return
        }

        if (initialContext) {
          setRaiseForm({
            issueType: initialContext.issueType || 'ORDER_ISSUE',
            subject: initialContext.subject || '',
            description: initialContext.description || '',
            orderMongoId: initialContext.orderId || '',
            itemId: initialContext.itemId || '',
          })
          setView('raise')
          return
        }

        if (active) {
          setActiveTicket(active)
          setView('chat')
          await loadMessages(active._id)
        } else if (list.length > 0) {
          setView('list')
        } else {
          setView('raise')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load support')
          setView('list')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authChecked, isAuthenticated, isModal, open, initialContext, loadTickets, loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, pendingMedia, scrollToBottom])

  useEffect(() => {
    pendingMediaRef.current = pendingMedia
  }, [pendingMedia])

  useEffect(() => {
    raiseMediaRef.current = raiseMedia
  }, [raiseMedia])

  useEffect(() => {
    return () => {
      revokeObjectUrls(pendingMediaRef.current)
      revokeObjectUrls(raiseMediaRef.current)
    }
  }, [])

  const addMediaFiles = (files, target) => {
    const list = Array.from(files || [])
    if (!list.length) return

    const setter = target === 'raise' ? setRaiseMedia : setPendingMedia

    setter((current) => {
      let imageCount = current.filter((m) => m.kind === 'image').length
      let videoCount = current.filter((m) => m.kind === 'video').length
      const next = [...current]
      let skipped = false

      for (const file of list) {
        if (!isAllowedChatMediaFile(file)) {
          skipped = true
          continue
        }
        const kind = isVideoFile(file) ? 'video' : 'image'
        if (kind === 'image' && imageCount >= MAX_CHAT_IMAGES) {
          skipped = true
          continue
        }
        if (kind === 'video' && videoCount >= MAX_CHAT_VIDEOS) {
          skipped = true
          continue
        }
        next.push({ file, url: URL.createObjectURL(file), kind })
        if (kind === 'image') imageCount += 1
        else videoCount += 1
      }

      if (skipped) {
        setError(
          `Use up to ${MAX_CHAT_IMAGES} images and ${MAX_CHAT_VIDEOS} videos (JPG, PNG, GIF, WebP, MP4, WebM, MOV).`,
        )
      }
      return next
    })
  }

  const removeMediaAt = (index, target) => {
    const setter = target === 'raise' ? setRaiseMedia : setPendingMedia
    const current = target === 'raise' ? raiseMedia : pendingMedia
    const item = current[index]
    if (item?.url) {
      try {
        URL.revokeObjectURL(item.url)
      } catch {
        /* ignore */
      }
    }
    setter(current.filter((_, i) => i !== index))
  }

  const clearPendingMedia = () => {
    revokeObjectUrls(pendingMedia)
    setPendingMedia([])
  }

  const clearRaiseMedia = () => {
    revokeObjectUrls(raiseMedia)
    setRaiseMedia([])
  }

  useEffect(() => {
    if (view !== 'chat' || !activeTicket?._id) return undefined
    const id = setInterval(() => {
      loadMessages(activeTicket._id).catch(() => {})
    }, 8000)
    return () => clearInterval(id)
  }, [view, activeTicket?._id, loadMessages])

  useEffect(() => {
    if (view !== 'raise' || !needsOrderLink) return
    let cancelled = false
    setLoadingOrders(true)
    supportTicketService
      .listOrderItems({ issueType: raiseForm.issueType, limit: 10 })
      .then((data) => {
        if (!cancelled) setOrderItems(data?.items || [])
      })
      .catch(() => {
        if (!cancelled) setOrderItems([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOrders(false)
      })
    return () => {
      cancelled = true
    }
  }, [view, needsOrderLink, raiseForm.issueType])

  const handleRaise = async (e) => {
    e.preventDefault()
    const subject = raiseForm.subject.trim()
    const description = raiseForm.description.trim()
    if (!subject || !description) {
      setError('Subject and description are required')
      return
    }
    if (needsOrderLink && (!raiseForm.orderMongoId || !raiseForm.itemId)) {
      setError('Please select an order item for this issue type')
      return
    }
    setSending(true)
    setError('')
    try {
      const payload = {
        issueType: raiseForm.issueType,
        subject,
        description,
        priority: 'MEDIUM',
      }
      if (needsOrderLink) {
        payload.orderId = raiseForm.orderMongoId
        payload.itemId = raiseForm.itemId
      }
      const images = raiseMedia.filter((m) => m.kind === 'image').map((m) => m.file)
      const videos = raiseMedia.filter((m) => m.kind === 'video').map((m) => m.file)
      const data = await supportTicketService.raiseTicket(payload, { images, videos })
      const ticket = data?.ticket || data
      clearRaiseMedia()
      setActiveTicket(ticket)
      setView('chat')
      setMessages([])
      await loadTickets()
    } catch (err) {
      setError(err?.message || 'Could not create ticket')
    } finally {
      setSending(false)
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault?.()
    const text = input.trim()
    const images = pendingMedia.filter((m) => m.kind === 'image').map((m) => m.file)
    const videos = pendingMedia.filter((m) => m.kind === 'video').map((m) => m.file)
    if ((!text && !images.length && !videos.length) || sending || !activeTicket?._id || isTerminal) return
    setSending(true)
    setError('')
    setInput('')
    const savedMedia = pendingMedia
    clearPendingMedia()
    try {
      await supportTicketService.sendMessage(activeTicket._id, { message: text, images, videos })
      await loadMessages(activeTicket._id)
    } catch (err) {
      setError(err?.message || 'Send failed')
      setInput(text)
      setPendingMedia(savedMedia)
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!activeTicket?._id) return
    try {
      await supportTicketService.closeTicket(activeTicket._id)
      const { list } = await loadTickets()
      setActiveTicket(null)
      setMessages([])
      setView(list.length ? 'list' : 'raise')
    } catch (err) {
      setError(err?.message || 'Could not close ticket')
    }
  }

  const startNewRequest = () => {
    clearRaiseMedia()
    clearPendingMedia()
    setAttachMenuOpen(false)
    setError('')
    setActiveTicket(null)
    setMessages([])
    setRaiseForm({
      issueType: 'OTHER',
      subject: '',
      description: '',
      orderMongoId: '',
      itemId: '',
    })
    setView('raise')
  }

  const showHeaderNew = view === 'chat' || view === 'list'

  if (isModal && !open) return null

  const shellClass = isModal
    ? 'fixed bottom-20 right-3 z-[60] flex h-[78vh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-t-3xl rounded-b-2xl bg-white shadow-2xl sm:bottom-24 sm:right-6 sm:h-[80vh]'
    : 'mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm'

  const backdrop =
    isModal && open ? (
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close support chat"
      />
    ) : null

  return (
    <>
      {backdrop}
      <section className={isModal ? shellClass : shellClass}>
        <header className="flex shrink-0 items-center justify-between bg-black px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white/90">
              <img src={botAvatar} alt="" className="h-9 w-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">Khush Support</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {activeTicket?.status ? statusLabel(activeTicket.status) : 'Help center'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'chat' ? (
              <button
                type="button"
                onClick={() => setView('list')}
                className="rounded-lg border border-white/30 px-2 py-1 text-[11px] font-medium text-white"
              >
                All chats
              </button>
            ) : null}
            {showHeaderNew ? (
              <button
                type="button"
                onClick={startNewRequest}
                className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                New
              </button>
            ) : null}
            {isModal ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white text-black"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>
            ) : null}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white px-3 py-4 sm:px-4">
          {view === 'loading' ? (
            <p className="text-center text-sm text-zinc-500">Loading support…</p>
          ) : null}

          {view === 'login' ? (
            <div className="space-y-4 py-8 text-center">
              <p className="text-sm text-zinc-600">Sign in to chat with our support team.</p>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white"
              >
                Login / Sign up
              </button>
            </div>
          ) : null}

          {view === 'list' ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">{STARTER}</p>
              <button
                type="button"
                onClick={startNewRequest}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                New support request
              </button>
              {tickets.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => openTicket(t)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-zinc-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-zinc-500">{t.ticketNumber}</span>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-zinc-900">{t.subject}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{formatChatTime(t.updatedAt || t.createdAt)}</p>
                </button>
              ))}
            </div>
          ) : null}

          {view === 'raise' ? (
            <form onSubmit={handleRaise} className="space-y-3">
              <p className="text-sm text-zinc-600">Describe your issue and we&apos;ll connect you with an agent.</p>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-700">Issue type</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  value={raiseForm.issueType}
                  onChange={(e) =>
                    setRaiseForm((f) => ({
                      ...f,
                      issueType: e.target.value,
                      orderMongoId: '',
                      itemId: '',
                    }))
                  }
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {needsOrderLink ? (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-700">Order item</span>
                  {loadingOrders ? (
                    <p className="text-xs text-zinc-500">Loading your orders…</p>
                  ) : (
                    <select
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      value={`${raiseForm.orderMongoId}|${raiseForm.itemId}`}
                      onChange={(e) => {
                        const [orderMongoId, itemId] = e.target.value.split('|')
                        setRaiseForm((f) => ({ ...f, orderMongoId, itemId }))
                      }}
                      required
                    >
                      <option value="|">Select order item…</option>
                      {orderItems.map((row) => (
                        <option
                          key={`${row.orderMongoId}-${row.itemId}`}
                          value={`${row.orderMongoId}|${row.itemId}`}
                        >
                          {row.orderId} — {row.product?.name || 'Item'}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              ) : null}
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-700">Subject</span>
                <input
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  value={raiseForm.subject}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief summary"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-700">Description</span>
                <textarea
                  className="min-h-[100px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  value={raiseForm.description}
                  onChange={(e) => setRaiseForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Tell us what happened…"
                  required
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-700">Photos &amp; videos (optional)</span>
                <p className="text-[11px] text-zinc-500">
                  Up to {MAX_CHAT_IMAGES} images and {MAX_CHAT_VIDEOS} videos to help us understand the issue.
                </p>
                <MediaPreviewStrip
                  items={raiseMedia}
                  disabled={sending}
                  onRemove={(index) => removeMediaAt(index, 'raise')}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={raiseImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addMediaFiles(e.target.files, 'raise')
                      e.target.value = ''
                    }}
                  />
                  <input
                    ref={raiseVideoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addMediaFiles(e.target.files, 'raise')
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending || raiseImageCount >= MAX_CHAT_IMAGES}
                    onClick={() => raiseImageInputRef.current?.click()}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 disabled:opacity-50"
                  >
                    Add photos ({raiseImageCount}/{MAX_CHAT_IMAGES})
                  </button>
                  <button
                    type="button"
                    disabled={sending || raiseVideoCount >= MAX_CHAT_VIDEOS}
                    onClick={() => raiseVideoInputRef.current?.click()}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 disabled:opacity-50"
                  >
                    Add videos ({raiseVideoCount}/{MAX_CHAT_VIDEOS})
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? 'Submitting…' : 'Start chat'}
              </button>
            </form>
          ) : null}

          {view === 'chat' && activeTicket ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-mono text-zinc-500">{activeTicket.ticketNumber}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{activeTicket.subject}</p>
                {activeTicket.description ? (
                  <p className="mt-1 text-xs text-zinc-600">{activeTicket.description}</p>
                ) : null}
                <TicketMediaBlock images={activeTicket.images} videos={activeTicket.videos} />
                {String(activeTicket.status).toUpperCase() === 'RESOLVED' ? (
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    className="mt-2 text-xs font-semibold text-black underline"
                  >
                    Close conversation
                  </button>
                ) : null}
              </div>

              {messages.length === 0 ? (
                <p className="text-center text-xs text-zinc-500">
                  Waiting for an agent. You can add more details below.
                </p>
              ) : (
                messages.map((m) => {
                  const isUser = String(m.senderType || '').toUpperCase() === 'USER'
                  const isSystem = String(m.senderType || '').toUpperCase() === 'SYSTEM'
                  const { images, videos } = collectMessageMedia(m)
                  const hasMedia = images.length > 0 || videos.length > 0
                  const showText = m.message && (!hasMedia || m.message !== '(media)')

                  if (isSystem) {
                    return (
                      <div key={m._id} className="flex justify-center">
                        <p className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-500">
                          {m.message}
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div key={m._id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser ? 'rounded-br-md bg-black text-white' : 'rounded-bl-md bg-zinc-100 text-zinc-900'
                        }`}
                      >
                        {showText ? <p className="whitespace-pre-wrap">{m.message}</p> : null}
                        <MessageMedia message={m} />
                        <p className={`mt-1 text-[10px] ${isUser ? 'text-white/70' : 'text-zinc-500'}`}>
                          {formatChatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">
                    Sending…
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {view === 'chat' && activeTicket && !isTerminal ? (
          <div className="shrink-0 border-t border-zinc-200 bg-white p-3 sm:p-4">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addMediaFiles(e.target.files, 'chat')
                e.target.value = ''
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => {
                addMediaFiles(e.target.files, 'chat')
                e.target.value = ''
              }}
            />
            <form onSubmit={handleSend} className="space-y-2">
              <MediaPreviewStrip
                items={pendingMedia}
                disabled={sending}
                onRemove={(index) => removeMediaAt(index, 'chat')}
              />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setAttachMenuOpen((open) => !open)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                    aria-label="Attach photo or video"
                    aria-expanded={attachMenuOpen}
                  >
                    <AttachIcon />
                  </button>
                  {attachMenuOpen ? (
                    <div className="absolute bottom-full left-0 z-10 mb-2 min-w-[9rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        disabled={pendingImageCount >= MAX_CHAT_IMAGES}
                        onClick={() => {
                          imageInputRef.current?.click()
                          setAttachMenuOpen(false)
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Photo ({pendingImageCount}/{MAX_CHAT_IMAGES})
                      </button>
                      <button
                        type="button"
                        disabled={pendingVideoCount >= MAX_CHAT_VIDEOS}
                        onClick={() => {
                          videoInputRef.current?.click()
                          setAttachMenuOpen(false)
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Video ({pendingVideoCount}/{MAX_CHAT_VIDEOS})
                      </button>
                    </div>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="min-h-[48px] flex-1 rounded-full border border-zinc-200 px-5 py-3 text-sm outline-none focus:border-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${
                    canSend ? 'bg-black hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
                  }`}
                  aria-label="Send"
                >
                  <SendIcon />
                </button>
              </div>
            </form>
            {error ? <p className="mt-2 text-center text-[11px] text-rose-600">{error}</p> : null}
          </div>
        ) : (
          error && view !== 'chat' ? (
            <p className="shrink-0 border-t border-zinc-200 px-4 py-2 text-center text-[11px] text-rose-600">{error}</p>
          ) : null
        )}
      </section>
    </>
  )
}
