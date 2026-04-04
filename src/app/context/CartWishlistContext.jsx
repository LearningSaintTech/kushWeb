import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAuth } from '../../app/context/AuthContext'
import { wishlistService } from '../../services/wishlist.service.js'
import { cartService } from '../../services/cart.service.js'
import { itemsService } from '../../services/items.service.js'

const STORAGE_KEY_CART = 'khush_cart'
const STORAGE_KEY_WISHLIST = 'khush_wishlist'

const CartWishlistContext = createContext(null)

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CART)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WISHLIST)
    const data = raw ? JSON.parse(raw) : []
    if (!Array.isArray(data)) return []
    if (data.length && typeof data[0] !== 'object') return []
    return data
  } catch {
    return []
  }
}

/** Format a delivery option from API for display (e.g. "1 day delivery - ₹50") */
function formatDeliveryOption(d) {
  if (!d) return '—'
  const type = d.deliveryType === '90_MIN' ? '90 min' : d.deliveryType === 'ONE_DAY' ? '1 day' : d.deliveryType === 'NORMAL' ? 'Standard' : d.deliveryType || 'Delivery'
  const charge = d.deliveryCharge != null ? `₹${Number(d.deliveryCharge)}` : ''
  return charge ? `${type} - ${charge}` : type
}

function mapWishlistItem(item, deliveryOptions = []) {
  const id = item?.itemId?._id ?? item?.itemId ?? item?._id
  const name = item?.itemId?.name ?? item?.name ?? ''
  const shortDescription = item?.itemId?.shortDescription ?? item?.shortDescription ?? ''
  const firstVariant = item?.itemId?.variants?.[0] ?? item?.variants?.[0]
  const imageUrl = firstVariant?.images?.[0]?.url ?? item?.itemId?.thumbnail ?? item?.imageUrl ?? ''
  const discountedPrice = item?.itemId?.discountedPrice ?? item?.discountedPrice
  const originalPriceNum = item?.itemId?.price ?? item?.price ?? 0
  const priceNum = discountedPrice ?? originalPriceNum ?? 0
  const priceStr = typeof priceNum === 'number' ? `₹${Number(priceNum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : (item?.price ?? '')
  const originalPriceStr = discountedPrice != null && originalPriceNum != null && Number(originalPriceNum) > Number(discountedPrice)
    ? `₹${Number(originalPriceNum).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : undefined
  const deliveryFromItem = item?.itemId?.deliveryType ?? item?.deliveryType
  let deliveryText = '—'
  if (deliveryFromItem === '90_MIN') deliveryText = '90 min'
  else if (deliveryFromItem === 'ONE_DAY') deliveryText = '1 day'
  else if (deliveryFromItem) deliveryText = String(deliveryFromItem)
  else if (deliveryOptions?.length > 0) deliveryText = formatDeliveryOption(deliveryOptions[0])
  return {
    id,
    title: name || 'Product',
    shortDescription,
    price: priceStr,
    originalPrice: originalPriceStr,
    image: imageUrl,
    hoverImage: firstVariant?.images?.[1]?.url ?? imageUrl,
    delivery: deliveryText,
    rating: 4,
  }
}

export function CartWishlistProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [cart, setCart] = useState(loadCart)
  const [wishlist, setWishlist] = useState(loadWishlist)
  const [wishlistIds, setWishlistIds] = useState([])
  const [wishlistDeliveries, setWishlistDeliveries] = useState([])
  const [cartCountFromApi, setCartCountFromApi] = useState(0)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart))
      } catch {}
    }
  }, [cart, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(wishlist))
      } catch {}
    }
  }, [wishlist, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistIds([])
      setWishlistDeliveries([])
      setCartCountFromApi(0)
      setCart(loadCart())
      setWishlist(loadWishlist())
      return
    }
    setWishlistLoading(true)
    const wishlistParams = { page: 1, limit: 100 }
    if (pincode) wishlistParams.pincode = String(pincode)
    Promise.all([
      wishlistService.getIds().then((res) => {
        const data = res?.data?.data ?? res?.data
        const ids = Array.isArray(data) ? data : (data?.ids ?? data?.itemIds ?? [])
        const idList = ids.map((x) => x?.itemId ?? x?.id ?? x).filter(Boolean)
        setWishlistIds(idList)
        return idList
      }).catch(() => setWishlistIds([])),
      wishlistService.getItems(wishlistParams).then((res) => {
        const data = res?.data?.data ?? res?.data
        const items = data?.items ?? (Array.isArray(data) ? data : [])
        const deliveries = data?.deliveries ?? []
        setWishlistDeliveries(Array.isArray(deliveries) ? deliveries : [])
        setWishlist(items.map((it) => mapWishlistItem(it, deliveries)))
      }).catch(() => {
        setWishlistDeliveries([])
        setWishlist([])
      }),
    ]).finally(() => setWishlistLoading(false))
  }, [isAuthenticated, pincode])

  const refetchCart = useCallback((params = {}) => {
    if (!isAuthenticated) return Promise.resolve()
    setCartLoading(true)
    const query = { limit: 100, ...params }
    if (pincode) query.pincode = String(pincode)
    return cartService.my(query).then((res) => {
      const data = res?.data?.data ?? res?.data
      const items = data?.items ?? []
      /** Badge = number of cart lines, not sum of quantities */
      setCartCountFromApi(items.length)
      const mapped = items.map((i) => {
        const id = i?.itemId?._id ?? i?.itemId ?? i?.productId
        const sku = i?.variant?.sku ?? i?.sku
        const name = i?.itemId?.name ?? i?.name ?? ''
        const price = i?.itemId?.discountedPrice ?? i?.discountedPrice ?? 0
        const imageUrl = i?.variant?.imageUrl ?? i?.itemId?.variants?.[0]?.images?.[0]?.url ?? i?.itemId?.thumbnail ?? ''
        return {
          id,
          sku,
          title: name || 'Product',
          price: typeof price === 'number' ? `₹${price.toFixed(2)}` : '₹0',
          image: imageUrl,
          quantity: Number(i?.quantity) || 1,
        }
      })
      setCart(mapped)
    }).catch(() => {
      setCartCountFromApi(0)
      setCart([])
    }).finally(() => {
      setCartLoading(false)
    })
  }, [isAuthenticated, pincode])

  useEffect(() => {
    if (!isAuthenticated) return
    refetchCart()
  }, [isAuthenticated, refetchCart])

  /** Build backend cart add payload: { itemId, variant: { color, size, sku, imageUrl }, quantity, pincode? } */
  const buildCartPayload = useCallback(async (product, pincode = null) => {
    const itemId = product?.id ?? product?._id
    if (!itemId) return null
    if (product?.variant && product?.sku) {
      const rawImg = product.variant.imageUrl ?? product.image ?? ''
      const imageUrl = (rawImg || 'https://placehold.co/400').replace(/ /g, '%20')
      return {
        itemId,
        variant: {
          color: product.variant.color ?? product.color ?? 'Default',
          size: product.variant.size ?? product.size ?? 'One Size',
          sku: product.sku,
          imageUrl,
        },
        quantity: Number(product.quantity) || 1,
        ...(pincode ? { pincode } : {}),
      }
    }
    try {
      const params = pincode ? { pincode: String(pincode) } : {}
      const res = await itemsService.getById(itemId, params)
      // Single-item API returns { item, deliveries, ... }; with pincode it returns pincode-specific inStock/availableQuantity per size
      const data = res?.data?.data ?? res?.data
      const item = data?.item ?? data
      if (!item?.variants?.length) {
        return null
      }
      // Prefer first variant/size that is in stock at this pincode (when pincode was sent); otherwise first size with sku
      let v = null
      let s = null
      for (const variant of item.variants) {
        const inStockSize = variant?.sizes?.find((sz) => sz?.sku && (sz.inStock === true || (sz.availableQuantity != null && Number(sz.availableQuantity) > 0)))
        const fallbackSize = variant?.sizes?.find((sz) => sz?.sku)
        const sizeToUse = inStockSize ?? fallbackSize
        if (sizeToUse) {
          v = variant
          s = sizeToUse
          break
        }
      }
      if (!s?.sku) {
        return null
      }
      const rawImageUrl = v?.images?.[0]?.url ?? (Array.isArray(v?.images) && v.images[0]?.url) ?? item?.thumbnail ?? ''
      // Encode spaces so URL passes backend isURL() validation (e.g. "Couple Collection" -> "Couple%20Collection")
      const imageUrl = (rawImageUrl || product?.image || 'https://placehold.co/400').replace(/ /g, '%20')
      const payload = {
        itemId: item._id ?? itemId,
        variant: {
          color: v?.color?.name ?? 'Default',
          size: s.size ?? 'One Size',
          sku: s.sku,
          imageUrl,
        },
        quantity: 1,
        ...(pincode ? { pincode } : {}),
      }
      return payload
    } catch (err) {
      return null
    }
  }, [])

  const addToCart = useCallback(
    async (product, pincodeParam = null) => {
      const pin = pincodeParam ?? pincode
      const { id, title, price, image, delivery, rating } = product ?? {}
      if (isAuthenticated) {
        const payload = await buildCartPayload(product, pin)
        if (!payload) {
          return { success: false, message: 'Could not add this item to cart.' }
        }
        try {
          await cartService.add(payload)
          await refetchCart()
          return { success: true }
        } catch (err) {
          const message = err?.response?.data?.message || err?.message || 'Could not add to cart.'
          return { success: false, message }
        }
      }
      setCart((prev) => {
        const existing = prev.find((item) => item.id === id)
        if (existing) {
          return prev.map((item) =>
            item.id === id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
          )
        }
        return [...prev, { id, title, price, image, delivery, rating, quantity: 1 }]
      })
      return { success: true }
    },
    [isAuthenticated, pincode, buildCartPayload, refetchCart]
  )

  const removeFromCart = useCallback(
    async (productIdOrSku) => {
      if (isAuthenticated) {
        const item = cart.find((c) => c.id === productIdOrSku || c.sku === productIdOrSku)
        const sku = item?.sku ?? productIdOrSku
        if (!sku) return
        try {
          await cartService.remove(sku)
          refetchCart()
        } catch {}
        return
      }
      setCart((prev) => prev.filter((item) => item.id !== productIdOrSku && item.sku !== productIdOrSku))
    },
    [isAuthenticated, cart, refetchCart]
  )

  const addToWishlist = useCallback(
    async (product) => {
      const id = product?.id ?? product?._id
      const { title, price, originalPrice, image, hoverImage, delivery, rating } = product ?? {}
      if (isAuthenticated) {
        if (wishlistIds.some((wid) => String(wid) === String(id))) return
        try {
          await wishlistService.toggle({ itemId: id })
          const wishlistParams = { page: 1, limit: 100 }
          if (pincode) wishlistParams.pincode = String(pincode)
          const [idsRes, itemsRes] = await Promise.all([
            wishlistService.getIds(),
            wishlistService.getItems(wishlistParams),
          ])
          const idsData = idsRes?.data?.data ?? idsRes?.data
          const idList = (Array.isArray(idsData) ? idsData : (idsData?.ids ?? idsData?.itemIds ?? [])).map((x) => (typeof x === 'object' ? (x?.itemId ?? x?.id ?? x) : x)).filter(Boolean)
          setWishlistIds(idList)
          const itemsData = itemsRes?.data?.data ?? itemsRes?.data
          const items = itemsData?.items ?? (Array.isArray(itemsData) ? itemsData : [])
          const deliveries = itemsData?.deliveries ?? []
          setWishlistDeliveries(Array.isArray(deliveries) ? deliveries : [])
          setWishlist(items.map((it) => mapWishlistItem(it, deliveries)))
        } catch (_) {}
        return
      }
      setWishlist((prev) => {
        if (prev.some((item) => item.id === id)) return prev
        return [...prev, { id, title, price, originalPrice, image, hoverImage, delivery, rating }]
      })
    },
    [isAuthenticated, wishlistIds, pincode]
  )

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (isAuthenticated) {
        try {
          await wishlistService.toggle({ itemId: productId })
          const wishlistParams = { page: 1, limit: 100 }
          if (pincode) wishlistParams.pincode = String(pincode)
          const [idsRes, itemsRes] = await Promise.all([
            wishlistService.getIds(),
            wishlistService.getItems(wishlistParams),
          ])
          const idsData = idsRes?.data?.data ?? idsRes?.data
          const idList = (Array.isArray(idsData) ? idsData : (idsData?.ids ?? idsData?.itemIds ?? [])).map((x) => x?.itemId ?? x?.id ?? x).filter(Boolean)
          setWishlistIds(idList)
          const itemsData = itemsRes?.data?.data ?? itemsRes?.data
          const items = itemsData?.items ?? (Array.isArray(itemsData) ? itemsData : [])
          const deliveries = itemsData?.deliveries ?? []
          setWishlistDeliveries(Array.isArray(deliveries) ? deliveries : [])
          setWishlist(items.map((it) => mapWishlistItem(it, deliveries)))
        } catch {}
        return
      }
      setWishlist((prev) => prev.filter((item) => item.id !== productId))
    },
    [isAuthenticated, pincode]
  )

  const toggleWishlist = useCallback(async (product) => {
    const id = typeof product === 'object' ? product?.id : product
    if (!id) return
    if (isAuthenticated) {
      try {
        await wishlistService.toggle({ itemId: id })
        const res = await wishlistService.getIds()
        const data = res?.data?.data ?? res?.data
        const ids = Array.isArray(data) ? data : (data?.ids ?? data?.itemIds ?? [])
        const idList = ids.map((x) => x?.itemId ?? x?.id ?? x).filter(Boolean)
        setWishlistIds(idList)
        const wishlistParams = { page: 1, limit: 100 }
        if (pincode) wishlistParams.pincode = String(pincode)
        const itemsRes = await wishlistService.getItems(wishlistParams)
        const itemsData = itemsRes?.data?.data ?? itemsRes?.data
        const items = itemsData?.items ?? (Array.isArray(itemsData) ? itemsData : [])
        const deliveries = itemsData?.deliveries ?? []
        setWishlistDeliveries(Array.isArray(deliveries) ? deliveries : [])
        setWishlist(items.map((it) => mapWishlistItem(it, deliveries)))
      } catch {}
      return
    }
    setWishlist((prev) => {
      const inList = prev.some((item) => item.id === id)
      if (inList) return prev.filter((item) => item.id !== id)
      const { title, price, originalPrice, image, hoverImage, delivery, rating } = typeof product === 'object' ? product : {}
      if (typeof product !== 'object' || !title) return prev
      return [...prev, { id, title, price, originalPrice, image, hoverImage, delivery, rating }]
    })
  }, [isAuthenticated, pincode])

  const isInWishlist = useCallback(
    (productId) => {
      if (isAuthenticated) return wishlistIds.some((wid) => String(wid) === String(productId))
      return wishlist.some((item) => item.id === productId)
    },
    [isAuthenticated, wishlistIds, wishlist]
  )

  const effectiveCartCount = isAuthenticated
    ? cartCountFromApi
    : cart.length
  const effectiveWishlistCount = isAuthenticated ? wishlistIds.length : wishlist.length

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      wishlistDeliveries,
      cartCount: effectiveCartCount,
      wishlistCount: effectiveWishlistCount,
      wishlistLoading,
      cartLoading,
      addToCart,
      removeFromCart,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      refetchCart,
    }),
    [
      cart,
      wishlist,
      wishlistDeliveries,
      effectiveCartCount,
      effectiveWishlistCount,
      wishlistLoading,
      cartLoading,
      addToCart,
      removeFromCart,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      refetchCart,
    ]
  )

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  )
}

export function useCartWishlist() {
  const ctx = useContext(CartWishlistContext)
  if (!ctx) throw new Error('useCartWishlist must be used within CartWishlistProvider')
  return ctx
}
