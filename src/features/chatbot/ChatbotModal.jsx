import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatbotService } from '../../services/chatbot.service.js'
import { ROUTES, getProductPath } from '../../utils/constants'
import botAvatar from '../../assets/temporary/Avatar.svg'

const QUICK_PROMPTS = [
  'Show me black kurti under 1200',
  'Suggest festive outfits',
  'Show my recent orders',
  'What is exchange policy?',
]

const STARTER_MESSAGE = {
  id: 'starter',
  role: 'assistant',
  text: "Hello, I'm Khushi 👋 I'm your personal fashion assistant. How can I help you?",
}

const KHUSH_OFFICE_ADDRESS = 'B-127, B Block, Sector 69, Uttar Pradesh 201309'

function formatChatTimestamp(d = new Date()) {
  try {
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

function formatMoney(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return 'Rs. 0'
  return `Rs. ${num.toLocaleString('en-IN')}`
}

function normalizePayload(raw) {
  const data = raw?.data?.data ?? raw?.data ?? raw ?? {}
  return {
    intent: data.intent ?? 'unknown',
    answer: typeof data.answer === 'string' ? data.answer : 'I am here to help you.',
    products: Array.isArray(data.products) ? data.products : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
  }
}

function extractMapQuery(text = '', sources = []) {
  const value = String(text || '').trim()
  if (!value) return ''

  const directMapLink = value.match(/https?:\/\/(?:www\.)?(?:google\.[^/\s]+\/maps|maps\.app\.goo\.gl)\S*/i)
  if (directMapLink?.[0]) return directMapLink[0]

  const topicSet = new Set(
    (Array.isArray(sources) ? sources : [])
      .map((s) => String(s?.topic || '').toLowerCase().trim())
      .filter(Boolean)
  )
  const likelyLocationTopic = topicSet.has('contact') || topicSet.has('brand')

  const hasExplicitLocationWords = /\b(address|located|location|office location|store location)\b/i.test(value)
  const hasKhushAddressPattern = /\bb-?\s*127\b|\bsector\s*69\b|\buttar\s*pradesh\b|\b201309\b/i.test(value)

  if (likelyLocationTopic && (hasExplicitLocationWords || hasKhushAddressPattern)) {
    return hasKhushAddressPattern ? KHUSH_OFFICE_ADDRESS : value
  }

  return ''
}

function getMapUrl(mapQuery) {
  if (!mapQuery) return ''
  if (/^https?:\/\//i.test(mapQuery)) return mapQuery
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
}

function ProductMini({ product }) {
  const id = product?.itemId
  const name = product?.name || 'Product'
  const description = product?.shortDescription || ''
  const inStock = product?.inStock !== false
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
      <div className="flex gap-2.5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          {product?.thumbnail ? (
            <img src={product.thumbnail} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-xs font-semibold text-zinc-900">{name}</p>
          <p className="line-clamp-1 text-[11px] text-zinc-500">{description || 'Recommended for you'}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-black">{formatMoney(product?.price)}</span>
            <span className={`text-[10px] ${inStock ? 'text-emerald-700' : 'text-rose-700'}`}>
              {inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>
        </div>
      </div>
      {id ? (
        <Link
          to={getProductPath(id, name, description)}
          className="mt-2 inline-flex rounded-lg bg-black px-2.5 py-1.5 text-[11px] font-semibold text-white"
        >
          View item
        </Link>
      ) : null}
    </div>
  )
}

function OrderMini({ order }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-900">{order?.orderId || 'Order'}</p>
        <span className="text-[10px] text-zinc-600">{String(order?.status || '').replaceAll('_', ' ')}</span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-600">
        {order?.itemCount || 0} item(s) • {formatMoney(order?.totalAmount)}
      </p>
      <Link to={ROUTES.ORDERS} className="mt-2 inline-flex text-[11px] font-semibold text-black underline underline-offset-2">
        Open orders
      </Link>
    </div>
  )
}

function SendIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

export default function ChatbotModal({ open, onClose }) {
  const [messages, setMessages] = useState([STARTER_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [openedAt] = useState(() => new Date())
  const scrollRef = useRef(null)
  const canSend = input.trim().length > 0 && !sending
  const suggestions = useMemo(() => QUICK_PROMPTS, [])
  const headerTime = useMemo(() => formatChatTimestamp(openedAt), [openedAt])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, sending])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const ask = async (rawText) => {
    const query = String(rawText || '').trim()
    if (!query || sending) return
    setInput('')
    setError('')
    const userMessage = { id: `u-${Date.now()}`, role: 'user', text: query }
    setMessages((prev) => [...prev, userMessage])
    setSending(true)
    try {
      const res = await chatbotService.sendMessage({ message: query, limit: 8 })
      const payload = normalizePayload(res)
      const botMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: payload.answer,
        products: payload.products,
        orders: payload.orders,
        sources: payload.sources,
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong.')
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'I hit a temporary issue. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" onClick={onClose} aria-label="Close chat" />
      <section className="fixed bottom-20 right-3 z-[60] flex h-[78vh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-t-3xl rounded-b-2xl bg-white shadow-2xl sm:bottom-24 sm:right-6 sm:h-[80vh]">
        {/* Header — black bar, avatar, Khushi, status, minimize */}
        <header className="flex shrink-0 items-center justify-between bg-black px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white/90">
              <img src={botAvatar} alt="" className="h-9 w-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Khushi
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                Always active
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white text-black transition hover:bg-white/90"
            aria-label="Minimize chat"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </button>
        </header>

        {/* Messages — white area */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-white px-3 py-4 sm:px-4">
          <p className="text-center text-[11px] text-zinc-400">{headerTime}</p>

          {messages.map((m) => {
            const isUser = m.role === 'user'
            const mapQuery = !isUser ? extractMapQuery(m.text, m.sources) : ''
            const mapUrl = getMapUrl(mapQuery)

            if (isUser) {
              return (
                <div key={m.id} className="flex justify-end">
                  <div
                    className="max-w-[88%] rounded-2xl rounded-br-md bg-black px-4 py-2.5 text-left text-sm leading-relaxed text-white"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {m.text}
                  </div>
                </div>
              )
            }

            return (
              <div key={m.id} className="flex gap-2.5">
                <div className="mt-0.5 shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                    <img src={botAvatar} alt="" className="h-7 w-7 object-contain" />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div
                    className="inline-block max-w-[95%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm leading-relaxed text-zinc-900"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {m.text}
                  </div>
                  {mapUrl ? (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                  {Array.isArray(m.products) && m.products.length > 0 ? (
                    <div className="space-y-2">
                      {m.products.slice(0, 3).map((p) => (
                        <ProductMini key={p.itemId || p.name} product={p} />
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(m.orders) && m.orders.length > 0 ? (
                    <div className="space-y-2">
                      {m.orders.slice(0, 3).map((o) => (
                        <OrderMini key={`${o.orderId || 'o'}-${o.createdAt || o.status || 'x'}`} order={o} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}

          {sending ? (
            <div className="flex gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                <img src={botAvatar} alt="" className="h-7 w-7 object-contain opacity-80" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                Typing…
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer — pill input + round send */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSend) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              placeholder="Type a message.."
              className="min-h-[48px] flex-1 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            />
            <button
              type="submit"
              disabled={!canSend}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition ${
                canSend ? 'bg-black hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
              }`}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
          {error ? <p className="mt-2 text-center text-[11px] text-rose-600">{error}</p> : null}
        </div>
      </section>
    </>
  )
}
