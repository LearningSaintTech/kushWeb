import { getProductPath } from '../../../utils/constants'

/**
 * Product page URL for a tagged product chip (mapItemChip shape).
 * Returns null when the chip has no real item id.
 */
export function taggedProductPath(product) {
  const id =
    product?.raw?.itemId || product?.raw?._id || product?.itemId || product?.id || null
  if (!id || id === 'item') return null
  return getProductPath(id, product?.name || product?.raw?.name || '')
}
