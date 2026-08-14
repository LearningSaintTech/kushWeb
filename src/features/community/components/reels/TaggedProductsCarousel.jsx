import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../app/context/AuthContext'
import { useCartWishlist } from '../../../../app/context/CartWishlistContext'
import { ROUTES } from '../../../../utils/constants'
import { debugError } from '../../../../utils/debugLog.js'

/**
 * Tagged products — horizontal carousel matching the design cards
 * (image left + details/CTA right), with scroll-snap + pagination.
 * Add to Cart adds the item then opens the cart page.
 */
export default function TaggedProductsCarousel({
  products = [],
  designedBy,
  variant = 'light',
  compact = false,
}) {
  const trackRef = useRef(null)
  const navigate = useNavigate()
  const { isAuthenticated, openAuthModal } = useAuth()
  const { addToCart } = useCartWishlist()
  const [activeIndex, setActiveIndex] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [errorById, setErrorById] = useState({})
  const isDark = variant === 'dark'

  const syncIndex = useCallback(() => {
    const el = trackRef.current
    if (!el || !products.length) return
    const card = el.querySelector('[data-product-card]')
    if (!card) return
    const gap = 12
    const step = card.offsetWidth + gap
    const next = Math.round(el.scrollLeft / step)
    setActiveIndex(Math.max(0, Math.min(products.length - 1, next)))
  }, [products.length])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    el.addEventListener('scroll', syncIndex, { passive: true })
    el.addEventListener('scrollend', syncIndex)
    return () => {
      el.removeEventListener('scroll', syncIndex)
      el.removeEventListener('scrollend', syncIndex)
    }
  }, [syncIndex])

  const scrollToIndex = (index) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-product-card]')
    if (!card) return
    const gap = 12
    const step = card.offsetWidth + gap
    el.scrollTo({ left: step * index, behavior: 'smooth' })
    setActiveIndex(index)
  }

  const handleAddToCart = async (product) => {
    const itemId = product?.id || product?.itemId || product?.raw?._id || product?.raw?.itemId
    if (!itemId) {
      setErrorById((prev) => ({ ...prev, [product?.id || 'x']: 'Product unavailable.' }))
      return
    }
    if (!isAuthenticated) {
      openAuthModal(ROUTES.CART)
      return
    }

    setBusyId(itemId)
    setErrorById((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })

    try {
      const result = await addToCart({
        id: itemId,
        title: product.name,
        price: product.price,
        image: product.image,
        color: product.color,
        size: product.size,
        variant:
          product.color || product.size
            ? {
                color: product.color || 'Default',
                size: product.size || 'One Size',
                imageUrl: product.image,
              }
            : undefined,
      })
      if (result?.success === false) {
        setErrorById((prev) => ({
          ...prev,
          [itemId]: result.message || 'Could not add to cart.',
        }))
        return
      }
      navigate(ROUTES.CART)
    } catch (err) {
      debugError('[Community] add to cart failed', err?.message)
      setErrorById((prev) => ({
        ...prev,
        [itemId]: err?.message || 'Could not add to cart.',
      }))
    } finally {
      setBusyId(null)
    }
  }

  if (!products.length) return null

  return (
    <section className={isDark || compact ? 'mt-0' : 'mt-5'}>
      <div className={`mb-2 flex items-center justify-between gap-3 ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <h3
          className={`font-inter font-medium ${
            compact ? 'text-xs' : 'text-sm'
          } ${isDark ? 'text-white/75' : 'text-neutral-500'}`}
        >
          Tagged Products
        </h3>
        {designedBy && !compact ? (
          <p className={`font-inter text-sm ${isDark ? 'text-white' : 'text-black'}`}>
            Designed By{' '}
            <button
              type="button"
              className="cursor-pointer font-medium italic underline underline-offset-2 transition hover:opacity-70"
            >
              {designedBy}
            </button>
          </p>
        ) : null}
      </div>

      <div
        ref={trackRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
        aria-label="Tagged products carousel"
      >
        {products.map((product) => {
          const itemId = product?.id || product?.itemId
          const busy = busyId && String(busyId) === String(itemId)
          const err = errorById[itemId]
          return (
            <article
              key={product.id}
              data-product-card
              className={`flex shrink-0 snap-start items-center gap-3 rounded-xl p-2.5 ${
                compact ? 'w-[min(100%,15.5rem)]' : 'w-[min(100%,17.5rem)]'
              } ${isDark ? 'bg-white/95' : 'bg-[#f5f5f5]'}`}
            >
              <div className="aspect-[60/71] w-[3.75rem] shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <p className="truncate font-inter text-sm font-semibold text-black">
                  {product.name}
                </p>
                <p className="mt-0.5 font-inter text-sm text-black">{product.price}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAddToCart(product)}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-black py-2 font-inter text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? 'Adding…' : 'Add to Cart'}
                </button>
                {err ? (
                  <p className="mt-1 font-inter text-[10px] leading-snug text-red-600">{err}</p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {products.length > 1 && !compact ? (
        <div
          className="mt-3 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Product pagination"
        >
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Go to product ${index + 1}`}
              onClick={() => scrollToIndex(index)}
              className={`h-1.5 cursor-pointer rounded-full transition-all ${
                index === activeIndex
                  ? isDark
                    ? 'w-4 bg-white'
                    : 'w-4 bg-black'
                  : isDark
                    ? 'w-1.5 bg-white/35 hover:bg-white/55'
                    : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
