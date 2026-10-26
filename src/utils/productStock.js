/*
 * Stock source of truth is `availableQuantity` (live inventory from the API).
 * `stock` / `totalStock` are stored counters that can be stale (e.g. 0 while
 * availableQuantity is 100), so they are only used when availableQuantity is absent.
 */

function toQty(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : null
}

/** Sellable quantity for one variant size, or null when the API sent no availableQuantity. */
export function getSizeAvailableQty(size) {
  return toQty(size?.availableQuantity)
}

/** Whether one variant size can be bought: availableQuantity > 0, else inStock flag, else stock. */
export function isSizeInStock(size) {
  if (!size) return false
  const qty = getSizeAvailableQty(size)
  if (qty != null) return qty > 0
  if (typeof size.inStock === 'boolean') return size.inStock
  return (toQty(size.stock) ?? 0) > 0
}

/**
 * Copy the PDP response's `availableBySku` map onto each size as availableQuantity,
 * so every size carries its live quantity.
 */
export function withAvailableBySku(item, availableBySku) {
  if (!item?.variants?.length || !availableBySku || typeof availableBySku !== 'object') {
    return item
  }
  return {
    ...item,
    variants: item.variants.map((v) => ({
      ...v,
      sizes: (v.sizes ?? []).map((s) =>
        s?.sku != null && availableBySku[s.sku] != null
          ? { ...s, availableQuantity: availableBySku[s.sku] }
          : s
      ),
    })),
  }
}

/** Sum available quantity across variant sizes (or top-level stock fields). */
export function getItemStockTotal(item) {
  if (!item || typeof item !== 'object') return undefined

  const topQty = toQty(item.availableQuantity)
  if (topQty != null) return topQty
  if (item.stock != null && Number.isFinite(Number(item.stock))) {
    return Math.max(0, Number(item.stock))
  }

  const variants = item.variants ?? []
  if (variants.length === 0) return undefined

  let total = 0
  let hasSize = false
  for (const v of variants) {
    for (const s of v.sizes ?? []) {
      hasSize = true
      if (!isSizeInStock(s)) continue
      total += getSizeAvailableQty(s) ?? (toQty(s.stock) ?? 0)
    }
  }
  return hasSize ? total : undefined
}

/**
 * Out-of-stock check for listing cards: item availableQuantity first, then the
 * API's inStock flag, then per-size availableQuantity, and stale totalStock last.
 */
export function isListingItemOutOfStock(item) {
  if (!item || typeof item !== 'object') return false

  const topQty = toQty(item.availableQuantity)
  if (topQty != null) return topQty <= 0
  if (typeof item.inStock === 'boolean') return !item.inStock

  const sizes = (item.variants ?? []).flatMap((v) => v.sizes ?? [])
  if (sizes.some((s) => getSizeAvailableQty(s) != null)) {
    return !sizes.some(isSizeInStock)
  }

  return item.totalStock != null ? Number(item.totalStock) <= 0 : false
}

/** "3 left" when stock is 1–4; nothing at 0 or 5+. */
export function getLowStockLabel(stock) {
  const n = Number(stock)
  if (!Number.isFinite(n) || n < 1 || n >= 5) return null
  return `${n} left`
}
