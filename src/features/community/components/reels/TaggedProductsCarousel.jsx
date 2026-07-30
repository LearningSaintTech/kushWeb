import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tagged products — horizontal carousel matching the design cards
 * (image left + details/CTA right), with scroll-snap + pagination.
 * Navigation is scroll / dots only — no side chevrons.
 */
export default function TaggedProductsCarousel({
  products = [],
  designedBy,
}) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

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

  if (!products.length) return null

  return (
    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-inter text-sm font-medium text-neutral-500">
          Tagged Products
        </h3>
        {designedBy ? (
          <p className="font-inter text-sm text-black">
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
        {products.map((product) => (
          <article
            key={product.id}
            data-product-card
            className="flex w-[min(100%,17.5rem)] shrink-0 snap-start items-center gap-3 rounded-xl bg-[#f5f5f5] p-2.5"
          >
            <div className="aspect-[60/71] w-[3.75rem] shrink-0 overflow-hidden rounded-lg bg-neutral-200">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>

            <div className="min-w-0 flex-1 py-0.5">
              <p className="truncate font-inter text-sm font-semibold text-black">
                {product.name}
              </p>
              <p className="mt-0.5 font-inter text-sm text-black">
                {product.price}
              </p>
              <button
                type="button"
                className="mt-2 w-full cursor-pointer rounded-lg bg-black py-2 font-inter text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-neutral-800"
              >
                Add to Cart
              </button>
            </div>
          </article>
        ))}
      </div>

      {products.length > 1 ? (
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
                  ? 'w-4 bg-black'
                  : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
