import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chatbotService } from '../../services/chatbot.service.js'
import { ROUTES, getProductPath } from '../../utils/constants'

const QUICK_PROMPTS = [
  'Show me black kurti under 1200',
  'Suggest festive outfits',
  'Show my recent orders',
  'What is exchange policy?',
  'Do you have cotton co-ord sets?',
]

const STARTER_MESSAGE = {
  role: 'assistant',
  text: 'Hi! I am your Khush shopping assistant. Ask me for products, order help, or policies. I can suggest styles quickly.',
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
    answer: typeof data.answer === 'string' ? data.answer : 'I am here to help you with shopping.',
    products: Array.isArray(data.products) ? data.products : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    sources: Array.isArray(data.sources) ? data.sources : [],
  }
}

function Bubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[80%] ${
          isUser
            ? 'rounded-br-md bg-black text-white'
            : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800'
        }`}
      >
        {message.text}
      </div>
    </div>
  )
}

function ProductCardMini({ product }) {
  const productId = product?.itemId
  const name = product?.name || 'Product'
  const description = product?.shortDescription || ''
  const price = formatMoney(product?.price)
  const mrp = Number(product?.mrp || 0)
  const inStock = product?.inStock !== false
  const thumbnail = product?.thumbnail

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex gap-3 p-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {thumbnail ? (
            <img src={thumbnail} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{description || 'Recommended for your search.'}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-black">{price}</span>
            {mrp > Number(product?.price || 0) ? (
              <span className="text-xs text-zinc-400 line-through">{formatMoney(mrp)}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-medium ${
            inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {inStock ? 'In stock' : 'Out of stock'}
        </span>
        {productId ? (
          <Link
            to={getProductPath(productId, name, description)}
            className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            View item
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function OrderCardMini({ order }) {
  const status = String(order?.status || 'UNKNOWN').replaceAll('_', ' ')
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">Order ID</p>
          <p className="text-sm font-semibold text-zinc-900">{order?.orderId || '—'}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">{status}</span>
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        {order?.itemCount || 0} item(s) {order?.firstItem ? `• ${order.firstItem}` : ''}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-black">{formatMoney(order?.totalAmount)}</p>
        <Link to={ROUTES.ORDERS} className="text-xs font-semibold text-black underline underline-offset-2">
          Open orders
        </Link>
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([STARTER_MESSAGE])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [latestPayload, setLatestPayload] = useState(null)
  const scrollerRef = useRef(null)

  const canSend = input.trim().length > 0 && !sending

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, sending, latestPayload])

  const suggestionChips = useMemo(() => QUICK_PROMPTS.slice(0, 5), [])

  const onAsk = async (text) => {
    const query = String(text || '').trim()
    if (!query || sending) return

    setError('')
    setSending(true)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: query }])

    try {
      const res = await chatbotService.sendMessage({ message: query, limit: 8 })
      const payload = normalizePayload(res)
      setLatestPayload(payload)
      setMessages((prev) => [...prev, { role: 'assistant', text: payload.answer }])
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send message.'
      setError(msg)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I hit a temporary issue while replying. Please try again in a moment.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-white pb-8 pt-26 sm:pt-30">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 sm:text-2xl">Khush AI Shopping Assistant</h1>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Product discovery, order guidance, and policy help in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.SEARCH} className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700">
              Explore products
            </Link>
            <Link to={ROUTES.ORDERS} className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white">
              My orders
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {messages.map((message, idx) => (
                <Bubble key={`${message.role}-${idx}`} message={message} />
              ))}
              {sending ? (
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                  Thinking...
                </div>
              ) : null}
            </div>

            <div className="border-t border-zinc-100 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onAsk(chip)}
                    className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onAsk(input)
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything: products, budget, order status, cancellation, exchange..."
                  rows={2}
                  className="min-h-[52px] flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-500 focus:border-black"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className={`h-[52px] rounded-2xl px-5 text-sm font-semibold text-white transition ${
                    canSend ? 'bg-black hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-300'
                  }`}
                >
                  Send
                </button>
              </form>
              {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Smart Suggestions</h2>
              <p className="mt-1 text-xs text-zinc-600">Try natural messages like a real chat.</p>
              <div className="mt-3 space-y-2">
                {[
                  'Show party wear under 2000',
                  'Need office wear for women',
                  'Show delivered orders',
                  'How does cancellation work?',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onAsk(q)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Results</h2>
                {latestPayload?.intent ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">
                    Intent: {latestPayload.intent}
                  </span>
                ) : null}
              </div>

              {latestPayload?.products?.length ? (
                <div className="space-y-3">
                  {latestPayload.products.slice(0, 4).map((product) => (
                    <ProductCardMini key={product.itemId || product.name} product={product} />
                  ))}
                </div>
              ) : null}

              {latestPayload?.orders?.length ? (
                <div className={`${latestPayload?.products?.length ? 'mt-4' : ''} space-y-3`}>
                  {latestPayload.orders.slice(0, 4).map((order) => (
                    <OrderCardMini key={`${order.orderId || 'order'}-${order.createdAt || order.status || 'x'}`} order={order} />
                  ))}
                </div>
              ) : null}

              {!latestPayload?.products?.length && !latestPayload?.orders?.length ? (
                <p className="text-xs text-zinc-500">No structured cards yet. Ask for products or your orders.</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

