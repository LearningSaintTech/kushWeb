import { useEffect, useId, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { itemsService } from '../../../../services/items.service.js'
import SizeChart from '../../../product/components/Sizechart.jsx'
import { debugError, debugLog } from '../../../../utils/debugLog.js'

function formatPrice(item) {
  const n = Number(item?.discountedPrice ?? item?.price ?? item?.originalPrice)
  if (!Number.isFinite(n)) return ''
  return `₹${n.toLocaleString('en-IN')}`
}

function variantThumb(variant, fallback) {
  const img = [...(variant?.images || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .find((m) => m?.url && !String(m.url).match(/\.(mp4|webm|mov)(\?|$)/i))
  return img?.url || fallback || ''
}

function stockLabel(size) {
  const qty = Number(size?.availableQuantity ?? size?.stock ?? 0)
  const inStock =
    size?.inStock === true || (size?.inStock !== false && qty > 0)
  if (!inStock) return { inStock: false, label: 'Sold out' }
  if (qty > 0) return { inStock: true, label: `${qty} left` }
  return { inStock: true, label: 'In stock' }
}

/**
 * Community tagged-product variant picker — color + size before cart/add.
 */
export default function CommunityVariantPickerModal({
  open,
  product = null,
  contentId = null,
  onClose,
  onConfirm,
}) {
  const titleId = useId()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const itemId = product?.id || product?.itemId || product?.raw?._id || null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [item, setItem] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showSizeChart, setShowSizeChart] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !itemId) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    setItem(null)
    setSelectedColor(null)
    setSelectedSize(null)
    setShowSizeChart(false)

    ;(async () => {
      try {
        const params = pincode ? { pincode: String(pincode) } : {}
        const res = await itemsService.getById(itemId, params)
        if (cancelled) return
        const data = res?.data?.data ?? res?.data
        const next = data?.item ?? data
        if (!next) {
          setError('Product not found.')
          return
        }
        setItem(next)
        const variants = Array.isArray(next.variants) ? next.variants : []
        let color = null
        let size = null
        for (const v of variants) {
          const firstInStock = v.sizes?.find((s) => {
            const qty = Number(s.availableQuantity ?? s.stock ?? 0)
            return s.inStock === true || (s.inStock !== false && qty > 0)
          })
          if (firstInStock) {
            color = v.color?.name ?? null
            size = firstInStock.size
            break
          }
        }
        setSelectedColor(color ?? variants[0]?.color?.name ?? null)
        setSelectedSize(size ?? variants[0]?.sizes?.[0]?.size ?? null)
        debugLog('[Community] variant picker loaded', {
          itemId,
          contentId,
          colors: variants.length,
        })
      } catch (err) {
        if (cancelled) return
        debugError('[Community] variant picker load failed', err?.message)
        setError(err?.response?.data?.message || err?.message || 'Could not load product.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, itemId, pincode, contentId])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showSizeChart) setShowSizeChart(false)
        else onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, showSizeChart, onClose])

  const selectedVariant = useMemo(() => {
    if (!item?.variants?.length) return null
    if (!selectedColor) return item.variants[0]
    return item.variants.find((v) => v.color?.name === selectedColor) || item.variants[0]
  }, [item, selectedColor])

  const sizes = useMemo(() => {
    if (!selectedVariant?.sizes?.length) return []
    return selectedVariant.sizes.map((s) => {
      const stock = stockLabel(s)
      return {
        size: s.size,
        sku: s.sku,
        inStock: stock.inStock,
        label: stock.label,
        raw: s,
      }
    })
  }, [selectedVariant])

  useEffect(() => {
    if (!sizes.length) return
    const current = sizes.find((s) => String(s.size) === String(selectedSize))
    if (!current || !current.inStock) {
      const first = sizes.find((s) => s.inStock) || sizes[0]
      setSelectedSize(first?.size ?? null)
    }
  }, [sizes, selectedSize])

  const selectedSizeObj = sizes.find((s) => String(s.size) === String(selectedSize))
  const headerImage =
    variantThumb(selectedVariant, item?.thumbnail || product?.image) || product?.image || ''
  const displayName = item?.name || product?.name || 'Product'
  const displayPrice = formatPrice(item) || product?.price || ''
  const hasSizeChart = Boolean(
    item?.sizeCharts?.in || item?.sizeCharts?.cm || item?.sizeChart,
  )

  if (!open) return null

  const handleConfirm = async () => {
    if (submitting || !itemId || !selectedSizeObj?.sku) return
    setSubmitting(true)
    setError('')
    try {
      const imageUrl = (headerImage || 'https://placehold.co/400').replace(/ /g, '%20')
      await onConfirm?.({
        id: itemId,
        title: displayName,
        price: displayPrice,
        image: headerImage,
        contentId: contentId || null,
        sku: selectedSizeObj.sku,
        color: selectedColor || selectedVariant?.color?.name || 'Default',
        size: selectedSizeObj.size,
        variant: {
          color: selectedColor || selectedVariant?.color?.name || 'Default',
          size: selectedSizeObj.size,
          sku: selectedSizeObj.sku,
          imageUrl,
        },
        quantity: 1,
      })
    } catch (err) {
      setError(err?.message || 'Could not add to cart.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-t-3xl bg-white shadow-[0_22px_80px_rgba(0,0,0,0.28)] animate-[community-notifications-in_280ms_cubic-bezier(0.22,1,0.36,1)] sm:rounded-3xl"
      >
        {showSizeChart ? (
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowSizeChart(false)}
                aria-label="Back"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <p className="font-inter text-sm font-semibold text-black">Size Chart</p>
            </div>
            <SizeChart item={item} />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 border-b border-dashed border-[#B8D4E8] px-4 py-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {headerImage ? (
                  <img src={headerImage} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id={titleId} className="truncate font-inter text-base font-bold text-black">
                  {displayName}
                </h2>
                <p className="mt-0.5 font-inter text-sm text-neutral-500">{displayPrice || '—'}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-black"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
              {loading ? (
                <p className="py-10 text-center font-inter text-sm text-neutral-500">Loading options…</p>
              ) : error && !item ? (
                <p className="py-10 text-center font-inter text-sm text-red-600">{error}</p>
              ) : (
                <>
                  {item?.variants?.length ? (
                    <section className="border-b border-dashed border-[#B8D4E8] pb-4">
                      <p className="font-inter text-sm font-bold text-black">Color</p>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {item.variants.map((v) => {
                          const name = v.color?.name || 'Default'
                          const active = selectedColor === name
                          const thumb = variantThumb(v, item.thumbnail)
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setSelectedColor(name)}
                              title={name}
                              className={`h-12 w-10 overflow-hidden rounded-md border-2 transition ${
                                active
                                  ? 'border-[#E85A3C]'
                                  : 'border-transparent ring-1 ring-neutral-200 hover:ring-neutral-300'
                              }`}
                            >
                              {thumb ? (
                                <img src={thumb} alt={name} className="h-full w-full object-cover" />
                              ) : (
                                <span
                                  className="block h-full w-full"
                                  style={{ backgroundColor: v.color?.hex || '#ccc' }}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}

                  {sizes.length ? (
                    <section className="border-b border-dashed border-[#B8D4E8] py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-inter text-sm font-bold text-black">
                          Size{selectedSize ? `: ${selectedSize}` : ''}
                        </p>
                        {hasSizeChart ? (
                          <button
                            type="button"
                            onClick={() => setShowSizeChart(true)}
                            className="cursor-pointer font-inter text-sm text-neutral-700 transition hover:text-black"
                          >
                            Size Chart &gt;
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {sizes.map((s) => {
                          const active = String(selectedSize) === String(s.size)
                          return (
                            <button
                              key={s.size}
                              type="button"
                              disabled={!s.inStock}
                              onClick={() => setSelectedSize(s.size)}
                              className={`min-w-[3.25rem] cursor-pointer rounded-lg border px-2.5 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                active
                                  ? 'border-black bg-black text-[#FF8A3D]'
                                  : 'border-neutral-200 bg-white text-black hover:border-neutral-400'
                              }`}
                            >
                              <span className="block font-inter text-sm font-bold leading-none">
                                {s.size}
                              </span>
                              <span
                                className={`mt-1 block font-inter text-[10px] leading-none ${
                                  active ? 'text-[#FF8A3D]' : 'text-[#E85A3C]'
                                }`}
                              >
                                {s.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}

                  {error ? (
                    <p className="mt-3 font-inter text-xs text-red-600" role="alert">
                      {error}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="border-t border-neutral-100 p-4 pb-5">
              <button
                type="button"
                disabled={loading || submitting || !selectedSizeObj?.sku}
                onClick={handleConfirm}
                className="w-full cursor-pointer rounded-xl bg-[#E8E8E8] py-3.5 font-inter text-sm font-bold text-black transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
