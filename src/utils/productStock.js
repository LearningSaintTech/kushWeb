/** Sum available quantity across variant sizes (or top-level stock fields). */
export function getItemStockTotal(item) {
  if (!item || typeof item !== 'object') return undefined

  if (item.stock != null && Number.isFinite(Number(item.stock))) {
    return Math.max(0, Number(item.stock))
  }
  if (
    item.availableQuantity != null &&
    Number.isFinite(Number(item.availableQuantity))
  ) {
    return Math.max(0, Number(item.availableQuantity))
  }

  const variants = item.variants ?? []
  if (variants.length === 0) return undefined

  let total = 0
  let hasSize = false
  for (const v of variants) {
    for (const s of v.sizes ?? []) {
      hasSize = true
      if (s.inStock === false) continue
      total += Number(s.availableQuantity ?? s.stock ?? 0) || 0
    }
  }
  return hasSize ? total : undefined
}

/** "3 left" when stock is 1–4; nothing at 0 or 5+. */
export function getLowStockLabel(stock) {
  const n = Number(stock)
  if (!Number.isFinite(n) || n < 1 || n >= 5) return null
  return `${n} left`
}
