import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatbotService } from '../../services/chatbot.service.js'
import { ROUTES, getProductPath } from '../../utils/constants'

const QUICK_PROMPTS = [
  'Show me black kurti under 1200',
  'Suggest festive outfits',
  'Show my recent orders',
  'What is exchange policy?',
]

const STARTER_MESSAGE = {
  id: 'starter',
  role: 'assistant',
  text: 'Hi! I am your Khush shopping assistant. Ask me anything about products, orders, and policy.',
}

const KHUSH_OFFICE_ADDRESS = 'B-127, B Block, Sector 69, Uttar Pradesh 201309'

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
    <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
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
    <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
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

export default function ChatbotModal({ open, onClose }) {
  const [messages, setMessages] = useState([STARTER_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const canSend = input.trim().length > 0 && !sending
  const suggestions = useMemo(() => QUICK_PROMPTS, [])

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
      <section className="fixed bottom-20 right-3 z-[60] flex h-[78vh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-2xl sm:bottom-24 sm:right-6 sm:h-[80vh]">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-bold text-zinc-900">Khush Assistant</p>
            <p className="text-[11px] text-zinc-500">Shop smarter, faster</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700">
            Close
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((m) => {
            const isUser = m.role === 'user'
            const mapQuery = !isUser ? extractMapQuery(m.text, m.sources) : ''
            const mapUrl = getMapUrl(mapQuery)
            return (
              <div key={m.id} className={`space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm ${isUser ? 'rounded-br-md bg-black text-white' : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800'}`}>
                  {m.text}
                </div>
                {!isUser && mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
                {!isUser && Array.isArray(m.products) && m.products.length > 0 ? (
                  <div className="space-y-2">
                    {m.products.slice(0, 3).map((p) => (
                      <ProductMini key={p.itemId || p.name} product={p} />
                    ))}
                  </div>
                ) : null}
                {!isUser && Array.isArray(m.orders) && m.orders.length > 0 ? (
                  <div className="space-y-2">
                    {m.orders.slice(0, 3).map((o) => (
                      <OrderMini key={`${o.orderId || 'o'}-${o.createdAt || o.status || 'x'}`} order={o} />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
          {sending ? <p className="text-xs text-zinc-500">Thinking...</p> : null}
        </div>

        <div className="border-t border-zinc-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700"
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
            className="flex items-end gap-2"
          >
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (canSend) ask(input)
                }
              }}
              placeholder="Type your message..."
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={!canSend}
              className={`h-12 rounded-xl px-4 text-sm font-semibold text-white ${canSend ? 'bg-black' : 'bg-zinc-300'}`}
            >
              Send
            </button>
          </form>
          {error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}
        </div>
      </section>
    </>
  )
}

