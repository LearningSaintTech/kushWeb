import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../../app/context/AuthContext'
import { setLocation } from '../../app/store/slices/locationSlice'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { cartService } from '../../services/cart.service.js'
import { sectionsService } from '../../services/content.service.js'
import { addressService } from '../../services/address.service.js'
import { deliveryService } from '../../services/delivery.service.js'
import { couponsService } from '../../services/coupons.service.js'
import { ROUTES, getProductPath } from '../../utils/constants'
import { trackEvent, cartRowToEcommerceItem, trackPixelAddToCart, trackPixelViewCart, trackPixelBeginCheckoutOnce, trackPixelRemoveFromCart } from '../../analytics'
import {
  DEFAULT_DONATION_AMOUNT,
  DONATION_MAX_AMOUNT,
  donationStateFromCart,
  buildDonationApiParams,
  getActiveDonationAmount,
} from '../../utils/donation.js'
import DonationPicker from '../../shared/components/DonationPicker.jsx'
import CartItemDescription from '../../shared/components/CartItemDescription.jsx'
import {
  BindOfferBillRows,
  BindOfferLineNote,
  BindOfferProgressBanner,
  BillSummaryItemTotal,
  CartLineOfferPrice,
} from '../../shared/components/BindOfferCartExtras.jsx'
import {
  enrichCartRowsWithPriceSummary,
  enrichCartRowsWithSectionBindOffers,
  getSectionBindProductIds,
  hasBindOffer,
  resolveCartBindOffers,
} from '../../utils/bindOffer.js'

/** Delivery is India-only; API still expects countryCode. */
const INDIA_PHONE_CODE = '+91'

function normalizeSpaces(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

function digitsOnly(s, maxLen = null) {
  const d = String(s ?? '').replace(/\D/g, '')
  return maxLen != null ? d.slice(0, maxLen) : d
}

function validateAddressForm(form) {
  const errors = {}

  const name = normalizeSpaces(form?.name)
  const addressLine = normalizeSpaces(form?.addressLine)
  const city = normalizeSpaces(form?.city)
  const state = normalizeSpaces(form?.state)
  const pin = digitsOnly(form?.pinCode, 6)
  const phone = digitsOnly(form?.phoneNumber, 10)

  if (!name) errors.name = 'Name is required.'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.'
  else if (name.length > 60) errors.name = 'Name must be at most 60 characters.'

  if (!phone) errors.phoneNumber = 'Phone number is required.'
  else if (phone.length !== 10) errors.phoneNumber = 'Phone number must be exactly 10 digits.'
  else if (/^[0]{10}$/.test(phone)) errors.phoneNumber = 'Please enter a valid phone number.'

  if (!addressLine) errors.addressLine = 'Address is required.'
  else if (addressLine.length < 5) errors.addressLine = 'Address must be at least 5 characters.'
  else if (addressLine.length > 160) errors.addressLine = 'Address must be at most 160 characters.'

  if (!city) errors.city = 'City is required.'
  else if (city.length < 2) errors.city = 'City must be at least 2 characters.'
  else if (city.length > 60) errors.city = 'City must be at most 60 characters.'

  if (!state) errors.state = 'State is required.'
  else if (state.length < 2) errors.state = 'State must be at least 2 characters.'
  else if (state.length > 60) errors.state = 'State must be at most 60 characters.'

  if (!pin) errors.pinCode = 'Pincode is required.'
  else if (pin.length !== 6) errors.pinCode = 'Pincode must be exactly 6 digits.'
  else if (/^[0]{6}$/.test(pin)) errors.pinCode = 'Please enter a valid pincode.'

  const t = String(form?.addressType ?? 'HOME').toUpperCase()
  if (!['HOME', 'WORK', 'OFFICE', 'OTHER'].includes(t)) errors.addressType = 'Please select a valid address type.'

  return errors
}

function formatRs(num) {
  if (num == null || Number.isNaN(num)) return 'Rs 0'
  return `Rs ${Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`
}

function formatRsDiscount(num) {
  const formatted = formatRs(num)
  return formatted.startsWith('−') ? formatted : `−${formatted}`
}

function formatAddress(addr) {
  if (!addr) return null
  const parts = [addr.addressLine, addr.city, addr.state, addr.pinCode].filter(Boolean)
  return parts.join(', ')
}

function formatCouponDate(dateVal) {
  if (!dateVal) return null
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isCouponApplicable(coupon, cartSubTotal) {
  if (cartSubTotal == null || Number.isNaN(cartSubTotal)) return false
  const now = new Date()
  const minCart = coupon.minCartValue ?? 0
  const maxCart = coupon.maxCartValue
  if (minCart > 0 && cartSubTotal < minCart) return false
  if (maxCart != null && maxCart > 0 && cartSubTotal > maxCart) return false
  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate)
    if (!Number.isNaN(expiry.getTime()) && expiry < now) return false
  }
  if (coupon.startDate) {
    const start = new Date(coupon.startDate)
    if (!Number.isNaN(start.getTime()) && start > now) return false
  }
  return true
}

function formatDeliveryDuration(dur, fallbackLabel = '') {
  if (!dur || typeof dur !== 'object') return fallbackLabel
  const min = dur.min ?? 0
  const max = dur.max ?? min
  const unit = (dur.unit || 'DAY').toUpperCase()
  const unitLabel = unit === 'DAY' ? (max === 1 ? 'Day' : 'Days') : unit === 'HOUR' ? (max === 1 ? 'Hour' : 'Hours') : unit
  if (min === max) return `${min} ${unitLabel}`
  return `${min}-${max} ${unitLabel}`
}

function pushRemoveFromCartEvent(row, quantity = 1) {
  const product = row?.itemId
  trackPixelRemoveFromCart({
    id: product?._id ?? product?.id ?? row?.guestProductId ?? row?.id,
    name: product?.name ?? row?.title,
    price: row?.unitPrice,
    quantity,
  })
}

function parseGuestPrice(priceStr) {
  if (typeof priceStr === 'number' && !Number.isNaN(priceStr)) return priceStr
  const n = Number(String(priceStr ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function guestCartToRows(guestCart) {
  return (guestCart || []).map((g) => {
    const unitPrice = parseGuestPrice(g.price)
    const qty = g.quantity ?? 1
    const id = g.id
    return {
      isGuest: true,
      guestProductId: id,
      _id: `guest-${id}`,
      itemId: {
        _id: id,
        name: g.title || 'Product',
        shortDescription: '',
        discountedPrice: unitPrice,
        price: unitPrice,
      },
      variant: {
        sku: `guest-${id}`,
        color: '',
        size: '',
        imageUrl: g.image || '',
      },
      quantity: qty,
      unitPrice,
      itemTotal: unitPrice * qty,
      outOfStock: false,
    }
  })
}

function CartPage() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useAuth()
  const {
    removeFromCart,
    refetchCart,
    cart: guestCartFromContext,
    incrementGuestCartItem,
    decrementGuestCartItem,
  } = useCartWishlist()
  const pincodeRedux = useSelector((s) => s?.location?.pincode) ?? null
  const selectedAddressIdFromRedux = useSelector((s) => s?.location?.selectedAddressId) ?? null
  const [cartData, setCartData] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState([])
  const [priceSummary, setPriceSummary] = useState(null)
  const [offerSections, setOfferSections] = useState([])
  const [couponInput, setCouponInput] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState(null)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [loading, setLoading] = useState(() => isAuthenticated)
  const [cartError, setCartError] = useState(null)
  const [couponError, setCouponError] = useState(null)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [addressFormLoading, setAddressFormLoading] = useState(false)
  const [addressFormError, setAddressFormError] = useState(null)
  const [addressFormPhoneError, setAddressFormPhoneError] = useState(null)
  const [addressForm, setAddressForm] = useState({
    name: '',
    phoneNumber: '',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    addressType: 'HOME',
    isDefault: true,
  })
  const [addressFormTouched, setAddressFormTouched] = useState({})
  const [addressFormErrors, setAddressFormErrors] = useState({})
  const [donationEnabled, setDonationEnabled] = useState(false)
  const [donationAmount, setDonationAmount] = useState('')
  const [donationPresetUsed, setDonationPresetUsed] = useState(false)
  const [donationCustomMode, setDonationCustomMode] = useState(false)
  const [donationError, setDonationError] = useState(null)
  const donationInitializedRef = useRef(false)
  const cartViewTrackedRef = useRef(false)

  const addressId = selectedAddress?._id
  const pincode = selectedAddress?.pinCode ?? pincodeRedux

  const lineItems = useMemo(() => {
    if (!isAuthenticated) return guestCartToRows(guestCartFromContext)
    let rows = cartData?.items ?? []
    if (priceSummary?.items?.length) {
      rows = enrichCartRowsWithPriceSummary(rows, priceSummary)
    } else {
      rows = rows.map((row) => ({
        ...row,
        bindOffer: row.bindOffer ?? row.itemId?.bindOffer ?? null,
      }))
    }
    return enrichCartRowsWithSectionBindOffers(rows, offerSections)
  }, [isAuthenticated, cartData?.items, guestCartFromContext, priceSummary, offerSections])

  useEffect(() => {
    if (!isAuthenticated) {
      setOfferSections([])
      return
    }
  let cancelled = false

  async function loadOfferSections() {
    // productLimit: 0 strips section.products — IDs are required to match cart lines
    const params = { isWeb: true, limit: 50, productLimit: 100 }
    if (pincode) params.pinCode = String(pincode)

    try {
      const res = await sectionsService.getActive(params)
      const raw = res?.data?.data?.items ?? res?.data?.items ?? []
      const withOffer = raw.filter((s) => hasBindOffer(s?.bindOffer))

      const detailed = await Promise.all(
        withOffer.map(async (section) => {
          if (getSectionBindProductIds(section).size > 0) return section
          if (!section?._id) return section
          try {
            const oneRes = await sectionsService.getOne(section._id)
            const full = oneRes?.data?.data ?? oneRes?.data
            return full && hasBindOffer(full?.bindOffer) ? full : section
          } catch {
            return section
          }
        }),
      )

      if (!cancelled) setOfferSections(detailed)
    } catch {
      if (!cancelled) setOfferSections([])
    }
  }

  loadOfferSections()
  return () => {
    cancelled = true
  }
}, [isAuthenticated, pincode])

  useEffect(() => {
    if (import.meta.env.PROD || !isAuthenticated || loading) return
    if (!cartData) return
    const resolvedBindOffers = resolveCartBindOffers(priceSummary, lineItems)
    console.log('[CartPage] cart /cart/my items:', (cartData?.items ?? []).map((row) => ({
      sku: row?.variant?.sku,
      quantity: row?.quantity,
      bindOffer: row?.bindOffer ?? row?.itemId?.bindOffer ?? null,
    })))
    console.log('[CartPage] price-summary bindOffers (raw):', priceSummary?.summary?.bindOffers ?? null)
    console.log('[CartPage] offer sections loaded:', offerSections.map((s) => ({
      _id: s._id,
      title: s.title,
      offerType: s.bindOffer?.offerType,
      label: s.bindOffer?.label,
      productIds: [...getSectionBindProductIds(s)],
      cartItemIds: (cartData?.items ?? []).map((row) =>
        String(row?.itemId?._id ?? row?.itemId ?? ''),
      ),
    })))
    console.log('[CartPage] resolved bindOffers (UI):', resolvedBindOffers)
    console.log('[CartPage] merged lineItems:', lineItems.map((row) => ({
      sku: row?.variant?.sku,
      quantity: row?.quantity,
      bindOffer: row?.bindOffer,
      itemSubtotal: row?.itemSubtotal,
    })))
  }, [isAuthenticated, loading, cartData, priceSummary, lineItems, offerSections])

  useEffect(() => {
    if (cartViewTrackedRef.current || !lineItems.length) return
    cartViewTrackedRef.current = true
    const ecommerceItems = lineItems.map((row) => cartRowToEcommerceItem(row))
    const cartValue = lineItems.reduce((sum, row) => {
      const unitPrice =
        row?.unitPrice != null
          ? Number(row.unitPrice)
          : parseGuestPrice(row?.itemId?.price ?? row?.price)
      return sum + unitPrice * (row?.quantity ?? 1)
    }, 0)
    trackPixelViewCart({ items: ecommerceItems, value: cartValue })
    trackEvent({ eventType: 'cart_view', cartValue, currency: 'INR' })
  }, [lineItems])

  const guestSubTotal = useMemo(() => {
    if (isAuthenticated) return 0
    return (guestCartFromContext || []).reduce(
      (sum, g) => sum + parseGuestPrice(g.price) * (g.quantity ?? 1),
      0,
    )
  }, [isAuthenticated, guestCartFromContext])

  const refetchAddresses = useCallback(async () => {
    const res = await addressService.getAll({ page: 1, limit: 50 })
    const list = res?.data?.data ?? res?.data
    const arr = Array.isArray(list) ? list : (list?.addresses ?? list?.data ?? [])
    const addressList = Array.isArray(arr) ? arr : []
    setAddresses(addressList)
    return addressList
  }, [])

  const fetchCart = useCallback(async (addrId = null) => {
    const params = { limit: 100 }
    const id = addrId ?? addressId
    if (id) params.addressId = id
    if (pincode) params.pincode = String(pincode)
    const res = await cartService.my(params)
    const data = res?.data?.data ?? res?.data
    setCartData(data)
    return data
  }, [addressId])

  const fetchPriceSummary = useCallback(async (couponCode = null) => {
    try {
      const params = couponCode ? { couponCode } : {}
      const donationParams = buildDonationApiParams({
        donationEnabled,
        donationAmount,
        donationPresetUsed,
      })
      if (!donationParams) {
        setDonationError(`Enter a valid donation amount (0–${DONATION_MAX_AMOUNT}).`)
        return null
      }
      setDonationError(null)
      Object.assign(params, donationParams)
      const res = await cartService.getPriceSummary(params)
      const data = res?.data?.data ?? res?.data
      setPriceSummary(data?.cartSummary ?? data)
      setCouponError(null)
      return data
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to get price summary'
      setCouponError(msg)
      setPriceSummary(null)
      return null
    }
  }, [donationEnabled, donationAmount, donationPresetUsed])

  useEffect(() => {
    if (donationInitializedRef.current || !cartData?.donation) return
    const s = donationStateFromCart(cartData.donation)
    setDonationEnabled(s.donationEnabled)
    setDonationAmount(s.donationAmount)
    setDonationPresetUsed(s.donationPresetUsed)
    setDonationCustomMode(s.donationCustomMode)
    donationInitializedRef.current = true
  }, [cartData?.donation])

  const handleDonationPresetSelect = (amount) => {
    const current = getActiveDonationAmount({
      donationEnabled,
      donationAmount,
      donationPresetUsed,
    })
    if (donationEnabled && current === amount) {
      setDonationEnabled(false)
      setDonationPresetUsed(false)
      setDonationAmount('')
      setDonationCustomMode(false)
    } else {
      setDonationEnabled(true)
      setDonationAmount(String(amount))
      setDonationPresetUsed(amount === DEFAULT_DONATION_AMOUNT)
      setDonationCustomMode(false)
    }
    setDonationError(null)
  }

  const fetchAvailableCoupons = useCallback(async () => {
    const res = await couponsService.getAvailable({ page: 1, limit: 50 })
    const data = res?.data?.data ?? res?.data
    const list = Array.isArray(data) ? data : (data?.data ?? [])
    return Array.isArray(list) ? list : []
  }, [])
  const cartSubTotalForCoupon =
    cartData?.summary?.subTotal ?? priceSummary?.summary?.subTotal ?? guestSubTotal ?? 0

  // On mount / auth: load addresses, then cart with addressId, then price summary
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      setCartData(null)
      setPriceSummary(null)
      return
    }
    setLoading(true)
    setCartError(null)
    let defaultAddr = null
    let addressList = []
    addressService
      .getDefaultAddress()
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        defaultAddr = data
        return data
      })
      .catch(() => null)
      .then(() => addressService.getAll({ page: 1, limit: 50 }).then((res) => {
        const list = res?.data?.data ?? res?.data
        const arr = Array.isArray(list) ? list : (list?.addresses ?? list?.data ?? [])
        return Array.isArray(arr) ? arr : []
      }).catch(() => []))
      .then((addressList) => {
        setAddresses(addressList)
        const chosen = (selectedAddressIdFromRedux && addressList.length)
          ? addressList.find((a) => String(a._id) === String(selectedAddressIdFromRedux)) ?? defaultAddr ?? addressList[0]
          : defaultAddr ?? addressList[0]
        setSelectedAddress(chosen || null)
        const id = chosen?._id
        refetchCart(id ? { addressId: id } : {})
        const cartParams = { limit: 100 }
        if (id) cartParams.addressId = id
        return cartService.my(cartParams)
      })
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        setCartData(data)
        if (data?.items?.length) return fetchPriceSummary(appliedCouponCode || null)
      })
      .catch(() => setCartError('Failed to load cart'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, selectedAddressIdFromRedux])

  // When addresses load, ensure we have a selected address (prefer navbar/Redux current address)
  useEffect(() => {
    if (addresses.length === 0 || selectedAddress != null) return
    const fromRedux = selectedAddressIdFromRedux
      ? addresses.find((a) => String(a._id) === String(selectedAddressIdFromRedux))
      : null
    const defaultOrFirst = fromRedux ?? addresses.find((a) => a.isDefault) ?? addresses[0]
    if (defaultOrFirst) setSelectedAddress(defaultOrFirst)
  }, [addresses, selectedAddress, selectedAddressIdFromRedux])

  // When selected address changes, refetch cart with new addressId (for delivery options)
  useEffect(() => {
    if (!isAuthenticated || !addressId) return
    refetchCart({ addressId })
    const params = { limit: 100, addressId }
    cartService.my(params).then((res) => {
      const data = res?.data?.data ?? res?.data
      setCartData(data)
      if (data?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    }).catch(() => { })
  }, [addressId, isAuthenticated])

  // Fetch delivery options from pincode check API (selected address pinCode or Redux pincode)
  useEffect(() => {
    if (!pincode || !String(pincode).trim()) {
      setDeliveryOptionsFromPincode([])
      return
    }
    deliveryService
      .checkByPincode(String(pincode).trim())
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const options = data?.deliveryOptions ?? []
        setDeliveryOptionsFromPincode(Array.isArray(options) ? options : [])
      })
      .catch(() => setDeliveryOptionsFromPincode([]))
  }, [pincode])

  // When cart items, coupon, or donation change, refresh price summary
  useEffect(() => {
    if (!cartData?.items?.length || !isAuthenticated) return
    fetchPriceSummary(appliedCouponCode || null)
  }, [
    cartData?.items?.length,
    appliedCouponCode,
    isAuthenticated,
    donationEnabled,
    donationAmount,
    donationPresetUsed,
    fetchPriceSummary,
  ])

  const handleIncreaseQty = async (sku, row) => {
    if (row?.isGuest && row.guestProductId != null) {
      incrementGuestCartItem(row.guestProductId)
      return
    }
    try {
      await cartService.increaseQty(sku)
      const product = row?.itemId
      trackPixelAddToCart({
        id: product?._id ?? product?.id ?? row?.guestProductId,
        name: product?.name ?? row?.title,
        price: row?.unitPrice,
        quantity: 1,
        sku: row?.variant?.sku,
      })
      refetchCart({ addressId })
      const next = await fetchCart()
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) { }
  }

  const handleDecreaseQty = async (sku, row) => {
    if (row?.isGuest && row.guestProductId != null) {
      decrementGuestCartItem(row.guestProductId)
      return
    }
    try {
      await cartService.decreaseQty(sku)
      pushRemoveFromCartEvent(row, 1)
      refetchCart({ addressId })
      const next = await fetchCart()
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) { }
  }

  const handleRemove = async (sku, row) => {
    if (row?.isGuest && row.guestProductId != null) {
      try {
        await removeFromCart(row.guestProductId)
        pushRemoveFromCartEvent(row)
      } catch (_) { }
      return
    }
    try {
      await removeFromCart(sku)
      pushRemoveFromCartEvent(row)
      refetchCart({ addressId })
      const next = await fetchCart()
      setCartData(next)
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) { }
  }

  const handleSelectDelivery = async (sku, deliveryId) => {
    try {
      await cartService.selectDelivery({ sku, deliveryId })
      refetchCart({ addressId })
      await fetchCart()
      fetchPriceSummary(appliedCouponCode || null)
    } catch (_) { }
  }

  const handleApplyCoupon = () => {
    const code = couponInput?.trim()
    if (!code) return
    trackEvent({
      eventType: 'coupon_apply_attempt',
      couponCode: code,
      cartValue: cartSubTotalForCoupon != null ? Number(cartSubTotalForCoupon) : undefined,
      currency: 'INR',
    })
    setAppliedCouponCode(code)
    setCouponError(null)
    fetchPriceSummary(code)
      .then((data) => {
        const summary = data?.cartSummary?.summary ?? data?.summary ?? {}
        const discount = Number(summary?.coupon?.discountAmount ?? 0)
        trackEvent({
          eventType: discount > 0 ? 'coupon_applied' : 'coupon_apply_attempt',
          couponCode: code,
          discountValue: discount > 0 ? discount : undefined,
          cartValue: cartSubTotalForCoupon != null ? Number(cartSubTotalForCoupon) : undefined,
          currency: 'INR',
        })
      })
  }

  const handleRemoveCoupon = () => {
    if (appliedCouponCode) {
      trackEvent({
        eventType: 'coupon_removed',
        couponCode: appliedCouponCode,
        cartValue: cartSubTotalForCoupon != null ? Number(cartSubTotalForCoupon) : undefined,
        currency: 'INR',
      })
    }
    setAppliedCouponCode(null)
    setCouponInput('')
    setCouponError(null)
    fetchPriceSummary(null)
  }

  const openCouponModal = () => {
    setCouponModalOpen(true)
    setLoadingCoupons(true)
    setAvailableCoupons([])
    fetchAvailableCoupons()
      .then((res) => {
        const normalCoupons = res.filter((c) => !c?.isInfluencer)
        setAvailableCoupons(normalCoupons)
      })
      .catch(() => setAvailableCoupons([]))
      .finally(() => setLoadingCoupons(false))
  }

  const handleApplyCouponFromModal = (code) => {
    if (!code) return
    trackEvent({
      eventType: 'coupon_apply_attempt',
      couponCode: code,
      cartValue: cartSubTotalForCoupon != null ? Number(cartSubTotalForCoupon) : undefined,
      currency: 'INR',
    })
    setCouponInput(code)
    setAppliedCouponCode(code)
    setCouponError(null)
    fetchPriceSummary(code)
      .then((data) => {
        const summary = data?.cartSummary?.summary ?? data?.summary ?? {}
        const discount = Number(summary?.coupon?.discountAmount ?? 0)
        trackEvent({
          eventType: discount > 0 ? 'coupon_applied' : 'coupon_apply_attempt',
          couponCode: code,
          discountValue: discount > 0 ? discount : undefined,
          cartValue: cartSubTotalForCoupon != null ? Number(cartSubTotalForCoupon) : undefined,
          currency: 'INR',
        })
      })
    setCouponModalOpen(false)
  }

  const openAddressForm = () => {
    setAddressFormError(null)
    setAddressFormPhoneError(null)
    setAddressFormTouched({})
    setAddressFormErrors({})
    setAddressForm({
      name: '',
      phoneNumber: '',
      addressLine: '',
      city: '',
      state: '',
      pinCode: '',
      addressType: 'HOME',
      isDefault: addresses.length === 0,
    })
    setAddressFormOpen(true)
  }

  const handleAddressFormChange = (field, value) => {
    setAddressForm((prev) => {
      const next = { ...prev, [field]: value }
      // keep validation responsive after user starts interacting
      if (addressFormTouched[field]) setAddressFormErrors(validateAddressForm(next))
      return next
    })
  }

  const touchAddressField = (field) => {
    setAddressFormTouched((prev) => ({ ...prev, [field]: true }))
    setAddressFormErrors((prev) => {
      const next = validateAddressForm(addressForm)
      // if user already has an error object, keep it but refresh values
      return { ...prev, ...next }
    })
  }

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault()
    setAddressFormError(null)
    setAddressFormPhoneError(null)
    const validation = validateAddressForm(addressForm)
    setAddressFormTouched({
      name: true,
      phoneNumber: true,
      addressLine: true,
      city: true,
      state: true,
      pinCode: true,
      addressType: true,
    })
    setAddressFormErrors(validation)
    if (Object.keys(validation).length > 0) {
      if (validation.phoneNumber) setAddressFormPhoneError(validation.phoneNumber)
      setAddressFormError('Please fix the highlighted fields.')
      return
    }
    const pin = digitsOnly(addressForm.pinCode, 6)
    const phoneDigits = digitsOnly(addressForm.phoneNumber, 10)
    setAddressFormLoading(true)
    try {
      const payload = {
        name: addressForm.name.trim(),
        phoneNumber: phoneDigits,
        countryCode: INDIA_PHONE_CODE,
        addressLine: normalizeSpaces(addressForm.addressLine),
        city: normalizeSpaces(addressForm.city),
        state: normalizeSpaces(addressForm.state),
        pinCode: parseInt(pin, 10) || 0,
        addressType: (addressForm.addressType || 'HOME').toUpperCase(),
        isDefault: !!addressForm.isDefault,
      }
      if (payload.pinCode <= 0) {
        setAddressFormError('Please enter a valid pincode.')
        setAddressFormLoading(false)
        return
      }
      const res = await addressService.create(payload)
      const newAddr = res?.data?.data ?? res?.data
      const list = await refetchAddresses()
      if (newAddr?._id) setSelectedAddress(newAddr)
      else if (list?.length) setSelectedAddress(list[list.length - 1])
      setAddressFormOpen(false)
      refetchCart(newAddr?._id ? { addressId: newAddr._id } : {})
      if (cartData?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to add address.'
      setAddressFormError(msg)
    } finally {
      setAddressFormLoading(false)
    }
  }

  const summary = isAuthenticated ? (priceSummary?.summary ?? {}) : {}
  const bindOffers = useMemo(
    () => resolveCartBindOffers(priceSummary, lineItems),
    [priceSummary, lineItems],
  )
  const subTotal = isAuthenticated
    ? (cartData?.summary?.subTotal ?? priceSummary?.summary?.subTotal ?? 0)
    : guestSubTotal
  const finalPayable = isAuthenticated ? (summary.finalPayable ?? subTotal) : guestSubTotal
  const coupon = summary.coupon
  const deliverySummary = summary.delivery
  const otherChargesTotal = summary.otherChargesTotal ?? 0
  const chargesList = isAuthenticated && Array.isArray(summary.charges) ? summary.charges : []
  const taxableAmount = summary.taxableAmount ?? 0
  const totalGst = summary.gst?.totalGst ?? summary.totalGst ?? 0
  const donationLineAmount =
    summary.donation?.enabled && Number(summary.donation?.amount) > 0
      ? Number(summary.donation.amount)
      : 0
  const activeDonationAmount = getActiveDonationAmount({
    donationEnabled,
    donationAmount,
    donationPresetUsed,
  })
  const donationForCheckout = donationEnabled && activeDonationAmount != null
    ? {
        enabled: true,
        amount: activeDonationAmount,
        presetUsed: donationPresetUsed,
      }
    : { enabled: false, amount: 0, presetUsed: false }
  const subTotalAfterDiscount = isAuthenticated
    ? (summary.subTotalAfterDiscount ?? summary.subTotal ?? 0)
    : guestSubTotal

  if (loading && isAuthenticated && !cartData) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading cart…</p>
        </div>
      </div>
    )
  }

  const items = lineItems
  const hasOutOfStockItem = items.some((row) => row.outOfStock === true || (row.availableQuantity != null && Number(row.availableQuantity) === 0))
  const deliveryOptions = deliveryOptionsFromPincode.length > 0 ? deliveryOptionsFromPincode : (cartData?.deliveryOptions ?? [])

  if (items.length === 0 && !cartError) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">   🛒 Your cart is on a diet 😅</h1>
          <p className="mt-2 text-gray-600">Start exploring and add your favorite picks.😊</p>
          <Link to={ROUTES.SEARCH} className="mt-6 inline-block px-6 py-3 bg-black text-white uppercase hover:bg-gray-800 transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black pt-40 pb-12 font-sans">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left column: Cart items */}
          <div className="lg:col-span-2">
            <div className="md:hidden space-y-3">
              {items.map((row) => {
                const item = row.itemId
                const name = item?.name ?? 'Product'
                const shortDesc = item?.shortDescription ?? ''
                const color = row.variant?.color ?? ''
                const colorHex = row.variant?.hex ?? ''
                const size = row.variant?.size ?? row.variant?.sizeLabel ?? ''
                const imageUrl = row.variant?.imageUrl ?? ''
                const sku = row.variant?.sku
                const qty = row.quantity ?? 1
                const unitPrice = row.unitPrice ?? (item?.discountedPrice ?? item?.price ?? 0)
                const itemTotal = row.itemTotal ?? unitPrice * qty
                const selectedDeliveryId = row.selectedDeliveryId?.toString?.() ?? row.selectedDeliveryId
                const productId = item?._id
                const productPath = productId ? getProductPath(productId, name, shortDesc) : null
                const lineBindOffer = row.bindOffer ?? null

                return (
                  <div key={row._id ?? sku} className="border border-gray-200 p-3 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-[72px] h-[96px] shrink-0 overflow-hidden bg-gray-100 rounded-sm">
                        {productPath ? (
                          <Link to={productPath} className="block w-full h-full">
                            {imageUrl ? (
                              <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                            )}
                          </Link>
                        ) : imageUrl ? (
                          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {productPath ? (
                          <Link to={productPath} className="block hover:underline">
                            <p className="font-bold text-black uppercase tracking-wide text-sm">{name}</p>
                          </Link>
                        ) : (
                          <p className="font-bold text-black uppercase tracking-wide text-sm">{name}</p>
                        )}
                        <CartItemDescription text={shortDesc} />
                        <BindOfferLineNote bindOffer={lineBindOffer} />
                        {(color || size) && (
                          <p className="text-gray-600 text-xs mt-1 normal-case flex items-center gap-1.5 flex-wrap">
                            {color && (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="w-4 h-4 rounded-full shrink-0 border border-gray-300"
                                  style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorHex) ? colorHex : '#999' }}
                                  title={color}
                                  aria-hidden
                                />
                                <span>{color}</span>
                              </span>
                            )}
                            {color && size && <span className="text-gray-400">|</span>}
                            {size && <span>Size: {size}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(sku, row)}
                          className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-10 h-9 flex items-center justify-center border-x border-gray-200 text-sm bg-white">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleIncreaseQty(sku, row)}
                          className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <CartLineOfferPrice
                        unitPrice={unitPrice}
                        quantity={qty}
                        itemSubtotal={row.itemSubtotal ?? itemTotal}
                        bindOffer={lineBindOffer}
                      />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {row.isGuest ? (
                        <p className="flex-1 text-xs text-gray-600 py-2">
                          Delivery speed and charges are confirmed at checkout after you sign in.
                        </p>
                      ) : (
                        <select
                          value={selectedDeliveryId ?? ''}
                          onChange={(e) => handleSelectDelivery(sku, e.target.value || null)}
                          className="flex-1 border border-gray-200 bg-gray-100 py-2 pl-3 pr-8 text-xs uppercase text-gray-800 rounded-md appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234a5568'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                        >
                          <option value="">Select delivery</option>
                          {deliveryOptions.map((opt) => {
                            const id = opt._id?.toString?.() ?? opt._id
                            const fallback = opt.deliveryType === '90_MIN' ? '90 MIN' : opt.deliveryType === 'ONE_DAY' ? '1 DAY' : opt.deliveryType || 'Standard'
                            const durationLabel = formatDeliveryDuration(opt.deliveryDuration, fallback)
                            const charge = opt.deliveryCharge != null && opt.deliveryCharge > 0 ? ` — Rs ${Number(opt.deliveryCharge).toLocaleString('en-IN')}` : ' — Free'
                            return (
                              <option key={id} value={id}>
                                {durationLabel}{charge}
                              </option>
                            )
                          })}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(sku, row)}
                        className="p-2 text-gray-500 hover:text-black transition-colors border border-gray-200 rounded-md"
                        aria-label="Remove from cart"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Product</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Quantity</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Total</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Delivery times</th>
                    <th className="py-3 px-4 w-10 border border-gray-300 bg-gray-100" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const item = row.itemId
                    const name = item?.name ?? 'Product'
                    const shortDesc = item?.shortDescription ?? ''
                    const color = row.variant?.color ?? ''
                    const colorHex = row.variant?.hex ?? ''
                    const size = row.variant?.size ?? row.variant?.sizeLabel ?? ''
                    const imageUrl = row.variant?.imageUrl ?? ''
                    const sku = row.variant?.sku
                    const qty = row.quantity ?? 1
                    const unitPrice = row.unitPrice ?? (item?.discountedPrice ?? item?.price ?? 0)
                    const itemTotal = row.itemTotal ?? unitPrice * qty
                    const selectedDeliveryId = row.selectedDeliveryId?.toString?.() ?? row.selectedDeliveryId

                    const productId = item?._id
                    const productPath = productId ? getProductPath(productId, name, shortDesc) : null
                    const lineBindOffer = row.bindOffer ?? null

                    return (
                      <tr key={row._id ?? sku} className="align-middle border-b border-gray-200">
                        <td className="pr-4 py-4">
                          <div className="flex gap-3">
                            <div className="w-[70px] h-[95px] shrink-0 overflow-hidden bg-gray-100 rounded-sm">
                              {productPath ? (
                                <Link to={productPath} className="block w-full h-full">
                                  {imageUrl ? (
                                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                                  )}
                                </Link>
                              ) : imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              {productPath ? (
                                <Link to={productPath} className="block hover:underline">
                                  <p className="font-bold text-black uppercase tracking-wide text-sm">{name}</p>
                                  <CartItemDescription text={shortDesc} />
                                  <BindOfferLineNote bindOffer={lineBindOffer} />
                                  {(color || size) && (
                                    <p className="text-gray-600 text-xs mt-1 normal-case flex items-center gap-1.5 flex-wrap">
                                      {color && (
                                        <span className="inline-flex items-center gap-1.5">
                                          <span
                                            className="w-4 h-4 rounded-full shrink-0 border border-gray-300"
                                            style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorHex) ? colorHex : '#999' }}
                                            title={color}
                                            aria-hidden
                                          />
                                          <span>{color}</span>
                                        </span>
                                      )}
                                      {color && size && <span className="text-gray-400">|</span>}
                                      {size && <span>Size: {size}</span>}
                                    </p>
                                  )}
                                </Link>
                              ) : (
                                <>
                                  <p className="font-bold text-black uppercase tracking-wide text-sm">{name}</p>
                                  <CartItemDescription text={shortDesc} />
                                  <BindOfferLineNote bindOffer={lineBindOffer} />
                                  {(color || size) && (
                                    <p className="text-gray-600 text-xs mt-1 normal-case flex items-center gap-1.5 flex-wrap">
                                      {color && (
                                        <span className="inline-flex items-center gap-1.5">
                                          <span
                                            className="w-4 h-4 rounded-full shrink-0 border border-gray-300"
                                            style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorHex) ? colorHex : '#999' }}
                                            title={color}
                                            aria-hidden
                                          />
                                          <span>{color}</span>
                                        </span>
                                      )}
                                      {color && size && <span className="text-gray-400">|</span>}
                                      {size && <span>Size: {size}</span>}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center align-middle">
                          <div className="inline-flex items-center bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQty(sku, row)}
                              className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-10 h-9 flex items-center justify-center border-x border-gray-200 text-sm bg-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleIncreaseQty(sku, row)}
                              className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="pl-4 py-4 text-right align-middle text-sm whitespace-nowrap">
                          <CartLineOfferPrice
                            unitPrice={unitPrice}
                            quantity={qty}
                            itemSubtotal={row.itemSubtotal ?? itemTotal}
                            bindOffer={lineBindOffer}
                            className="text-sm font-semibold whitespace-nowrap text-right"
                          />
                        </td>
                        <td className="pl-4 py-4 align-middle">
                          {row.isGuest ? (
                            <p className="text-xs text-gray-600 max-w-[180px]">
                              Confirmed at checkout after sign-in.
                            </p>
                          ) : (
                            <select
                              value={selectedDeliveryId ?? ''}
                              onChange={(e) => handleSelectDelivery(sku, e.target.value || null)}
                              className="w-full max-w-[180px] border border-gray-200 bg-gray-100 py-2 pl-3 pr-8 text-sm uppercase text-gray-800 rounded-md appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234a5568'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                            >
                              <option value="">Select delivery</option>
                              {deliveryOptions.map((opt) => {
                                const id = opt._id?.toString?.() ?? opt._id
                                const fallback = opt.deliveryType === '90_MIN' ? '90 MIN' : opt.deliveryType === 'ONE_DAY' ? '1 DAY' : opt.deliveryType || 'Standard'
                                const durationLabel = formatDeliveryDuration(opt.deliveryDuration, fallback)
                                const charge = opt.deliveryCharge != null && opt.deliveryCharge > 0 ? ` — Rs ${Number(opt.deliveryCharge).toLocaleString('en-IN')}` : ' — Free'
                                return (
                                  <option key={id} value={id}>
                                    {durationLabel}{charge}
                                  </option>
                                )
                              })}
                            </select>
                          )}
                        </td>
                        <td className="pl-2 py-4 align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemove(sku, row)}
                            className="p-2 text-gray-500 hover:text-black transition-colors"
                            aria-label="Remove from cart"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column: Delivery, Coupon, Bill Summary */}
          <div className="lg:col-span-1 space-y-6 border border-gray-300  p-5 bg-white">
            {/* Delivery To */}
            {!isAuthenticated && (
              <section className="rounded border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  Sign in to add a delivery address, apply coupons, and complete checkout. You can still edit your bag here.
                </p>
                <Link
                  to={ROUTES.AUTH}
                  className="mt-3 inline-block px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Sign in
                </Link>
              </section>
            )}
            {isAuthenticated && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-black mb-3">Delivery to:</h2>
                {addresses.length > 0 ? (
                  <>
                    <select
                      value={selectedAddress?._id != null ? String(selectedAddress._id) : (addresses[0]?._id != null ? String(addresses[0]._id) : '')}
                      onChange={(e) => {
                        const id = e.target.value
                        const addr = addresses.find((a) => String(a._id ?? '') === id)
                        if (addr) {
                          setSelectedAddress(addr)
                          dispatch(setLocation({
                            pincode: addr.pinCode != null ? String(addr.pinCode) : null,
                            addressLabel: formatAddress(addr) || (addr.pinCode ? `Pin ${addr.pinCode}` : null),
                            selectedAddressId: addr._id ?? null,
                          }))
                        }
                      }}
                      className="w-full border border-gray-300 py-2 px-3 text-sm mb-3 bg-white rounded-none"
                    >
                      {addresses.map((addr) => (
                        <option key={addr._id} value={String(addr._id ?? '')}>
                          {addr.name} – {addr.addressLine}
                        </option>
                      ))}
                    </select>
                    {/* Selected address details below dropdown — always show when we have addresses */}
                    {(() => {
                      const selectedId = selectedAddress?._id != null ? String(selectedAddress._id) : (addresses[0]?._id != null ? String(addresses[0]._id) : null)
                      const toShow = selectedId
                        ? (addresses.find((a) => String(a._id ?? '') === selectedId) ?? addresses.find((a) => a.isDefault) ?? addresses[0])
                        : (addresses.find((a) => a.isDefault) ?? addresses[0])
                      if (!toShow) return null
                      return (
                        <div className="text-sm text-gray-800 mb-3 pt-1 border-t border-gray-200">
                          <p className="font-semibold uppercase text-black">{toShow.name}</p>
                          <p className="text-gray-700 mt-1">{formatAddress(toShow)}</p>
                          {(toShow.phoneNumber || toShow.countryCode) && (
                            <p className="text-xs uppercase text-gray-600 mt-1">
                              Contact: {[toShow.countryCode, toShow.phoneNumber].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">Please enter a delivery address to continue.</p>
                )}
                <button
                  type="button"
                  onClick={openAddressForm}
                  className="w-full border border-black py-2.5 px-4 text-sm font-medium uppercase bg-white text-black hover:bg-gray-50 transition-colors rounded-none"
                >
                  Add new address
                </button>
              </section>
            )}

            {/* Add / Edit Address modal */}
            {addressFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addressFormLoading && setAddressFormOpen(false)}>
                <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Add new address</h3>
                    <button type="button" onClick={() => !addressFormLoading && setAddressFormOpen(false)} className="p-2 text-gray-500 hover:text-black" aria-label="Close">×</button>
                  </div>
                  <form onSubmit={handleAddressFormSubmit} className="overflow-y-auto p-4 flex-1 space-y-3  scrollbar-hide">
                    {addressFormError && <p className="text-xs text-red-600">{addressFormError}</p>}
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={addressForm.name}
                        onChange={(e) => handleAddressFormChange('name', e.target.value)}
                        onBlur={() => touchAddressField('name')}
                        className="w-full border border-gray-300 py-2 px-3 text-sm"
                        placeholder="Full name"
                        required
                        maxLength={60}
                      />
                      {addressFormTouched.name && addressFormErrors.name && <p className="mt-1 text-xs text-red-600">{addressFormErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Phone</label>
                      <div className="flex border border-gray-300 overflow-hidden rounded-none">
                        <span className="shrink-0 flex items-center border-r border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600" aria-hidden>
                          {INDIA_PHONE_CODE}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={addressForm.phoneNumber}
                          onChange={(e) =>
                            handleAddressFormChange(
                              'phoneNumber',
                              e.target.value.replace(/\D/g, '').slice(0, 10),
                            )
                          }
                          onBlur={() => touchAddressField('phoneNumber')}
                          className="min-w-0 flex-1 border-0 py-2 px-3 text-sm outline-none"
                          placeholder="10-digit mobile number"
                          required
                        />
                      </div>
                      {(addressFormPhoneError ||
                        (addressFormTouched.phoneNumber && addressFormErrors.phoneNumber)) && (
                          <p className="mt-1 text-xs text-red-600">
                            {addressFormPhoneError || addressFormErrors.phoneNumber}
                          </p>
                        )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={addressForm.addressLine}
                        onChange={(e) => handleAddressFormChange('addressLine', e.target.value)}
                        onBlur={() => touchAddressField('addressLine')}
                        className="w-full border border-gray-300 py-2 px-3 text-sm"
                        placeholder="Street, area, building"
                        required
                        maxLength={160}
                      />
                      {addressFormTouched.addressLine && addressFormErrors.addressLine && <p className="mt-1 text-xs text-red-600">{addressFormErrors.addressLine}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => handleAddressFormChange('city', e.target.value)}
                          onBlur={() => touchAddressField('city')}
                          className="w-full border border-gray-300 py-2 px-3 text-sm"
                          placeholder="City"
                          required
                          maxLength={60}
                        />
                        {addressFormTouched.city && addressFormErrors.city && <p className="mt-1 text-xs text-red-600">{addressFormErrors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) => handleAddressFormChange('state', e.target.value)}
                          onBlur={() => touchAddressField('state')}
                          className="w-full border border-gray-300 py-2 px-3 text-sm"
                          placeholder="State"
                          required
                          maxLength={60}
                        />
                        {addressFormTouched.state && addressFormErrors.state && <p className="mt-1 text-xs text-red-600">{addressFormErrors.state}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={addressForm.pinCode}
                        onChange={(e) =>
                          handleAddressFormChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        onBlur={() => touchAddressField('pinCode')}
                        className="w-full border border-gray-300 py-2 px-3 text-sm"
                        placeholder="Pincode"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                      />
                      {addressFormTouched.pinCode && addressFormErrors.pinCode && <p className="mt-1 text-xs text-red-600">{addressFormErrors.pinCode}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Type</label>
                      <select
                        value={addressForm.addressType}
                        onChange={(e) => handleAddressFormChange('addressType', e.target.value)}
                        onBlur={() => touchAddressField('addressType')}
                        className="w-full border border-gray-300 py-2 px-3 text-sm bg-white"
                      >
                        <option value="HOME">Home</option>
                        <option value="WORK">Work</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {addressFormTouched.addressType && addressFormErrors.addressType && <p className="mt-1 text-xs text-red-600">{addressFormErrors.addressType}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="addr-default" checked={!!addressForm.isDefault} onChange={(e) => handleAddressFormChange('isDefault', e.target.checked)} className="rounded border-gray-300" />
                      <label htmlFor="addr-default" className="text-sm text-gray-700">Set as default address</label>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => !addressFormLoading && setAddressFormOpen(false)} className="flex-1 border border-gray-300 py-2 px-4 text-sm font-medium uppercase">Cancel</button>
                      <button type="submit" disabled={addressFormLoading} className="flex-1 bg-black text-white py-2 px-4 text-sm font-semibold uppercase hover:bg-gray-800 disabled:opacity-60">
                        {addressFormLoading ? 'Saving…' : 'Save address'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Apply Coupon */}
            {isAuthenticated && (
              <section>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-sm font-semibold text-black">Apply Coupon</h2>
                  <button
                    type="button"
                    onClick={openCouponModal}
                    className="text-xs font-medium uppercase text-black hover:underline whitespace-nowrap"
                  >
                    See all
                  </button>
                </div>
                {appliedCouponCode ? (
                  <div className="flex items-center justify-between gap-2 p-3 border border-green-600 bg-green-50/80">
                    <span className="text-sm font-medium text-green-800 uppercase">{appliedCouponCode}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold uppercase text-green-700 hover:text-green-900 underline"
                    >
                      Remove coupon
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 items-stretch">
                      <div className="flex-1 min-w-[140px] relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          placeholder="ENTER COUPON CODE HERE"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          className="w-full border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder-gray-400 uppercase rounded-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-black text-white py-2 px-5 text-sm font-semibold uppercase hover:bg-gray-800 transition-colors whitespace-nowrap rounded-none"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
                  </>
                )}
              </section>
            )}

            {/* Coupons modal — larger, enhanced UI with Apply / Remove per coupon */}
            {isAuthenticated && couponModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCouponModalOpen(false)}>
                <div className="bg-white w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold uppercase tracking-wider text-black">Available coupons</h3>
                    <button type="button" onClick={() => setCouponModalOpen(false)} className="p-2 text-gray-500 hover:text-black text-xl leading-none" aria-label="Close">×</button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-5 scrollbar-hide">
                    {loadingCoupons ? (
                      <p className="text-sm text-gray-500 text-center py-10">Loading coupons…</p>
                    ) : availableCoupons.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-10">No coupons available.</p>
                    ) : (
                      <ul className="space-y-4">
                        {availableCoupons.map((c) => {
                          const code = (c.code ?? '').trim()
                          const desc = (c.description ?? '')
                          const type = (c.discountType || '').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FLAT'
                          const value = c.discountValue ?? 0
                          const maxDiscount = c.maxDiscountAmount ?? c.maxDiscount
                          const minCart = c.minCartValue ?? 0
                          const maxCart = c.maxCartValue
                          const perUserLimit = c.perUserUsageLimit ?? 0
                          const expiryDate = formatCouponDate(c.expiryDate)
                          const discountLabel = type === 'PERCENT'
                            ? `${value}% off${maxDiscount ? ` (max Rs ${Number(maxDiscount).toLocaleString('en-IN')})` : ''}`
                            : `Rs ${Number(value).toLocaleString('en-IN')} off`
                          const isApplied = appliedCouponCode && String(appliedCouponCode).toUpperCase() === String(code).toUpperCase()
                          const applicable = isCouponApplicable(c, subTotal)
                          return (
                            <li key={c._id ?? code} className={isApplied ? 'ring-2 ring-green-600 ring-offset-1' : ''}>
                              <div className={`w-full text-left border p-4 transition-colors ${applicable ? 'border-gray-300 bg-white hover:border-gray-400' : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-75'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <span className={`block font-semibold uppercase ${applicable ? 'text-black' : 'text-gray-500'}`}>{code}</span>
                                    {desc && <span className={`block text-sm mt-1 ${applicable ? 'text-gray-700' : 'text-gray-500'}`}>{desc}</span>}
                                    <span className={`block text-sm font-medium mt-1 ${applicable ? 'text-gray-800' : 'text-gray-500'}`}>{discountLabel}</span>
                                    <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                                      {minCart > 0 && <p>Min order: Rs {Number(minCart).toLocaleString('en-IN')}</p>}
                                      {maxCart != null && maxCart > 0 && <p>Valid on orders up to Rs {Number(maxCart).toLocaleString('en-IN')}</p>}
                                      {expiryDate && <p>Valid till: {expiryDate}</p>}
                                      {perUserLimit > 0 && <p>{perUserLimit === 1 ? 'One use per user' : `Use up to ${perUserLimit} times per user`}</p>}
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {isApplied ? (
                                      <button
                                        type="button"
                                        onClick={() => { handleRemoveCoupon(); setCouponModalOpen(false) }}
                                        className="px-4 py-2 text-xs font-semibold uppercase border border-green-600 text-green-700 bg-white hover:bg-green-50 transition-colors"
                                      >
                                        Remove coupon
                                      </button>
                                    ) : applicable ? (
                                      <button
                                        type="button"
                                        onClick={() => handleApplyCouponFromModal(code)}
                                        className="px-4 py-2 text-xs font-semibold uppercase bg-black text-white hover:bg-gray-800 transition-colors"
                                      >
                                        Apply
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="px-4 py-2 text-xs font-semibold uppercase bg-gray-300 text-gray-500 cursor-not-allowed"
                                      >
                                        Not applicable
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Donation */}
            {isAuthenticated && (
              <DonationPicker
                className="border border-gray-200 rounded-sm bg-[#fafafa] p-3.5 sm:p-4"
                donationEnabled={donationEnabled}
                donationAmount={donationAmount}
                donationPresetUsed={donationPresetUsed}
                donationError={donationError}
                onSelectPreset={handleDonationPresetSelect}
              />
            )}

            {/* Bill Summary */}
            <section>
              <h2 className="text-sm font-semibold text-black mb-3">Bill Summary</h2>
              {isAuthenticated ? (
                <BindOfferProgressBanner bindOffers={bindOffers} className="mb-3" />
              ) : null}
              <div className="space-y-2.5 text-sm">
                <BillSummaryItemTotal
                  summary={summary}
                  bindOffers={bindOffers}
                  subTotalAfterDiscount={subTotalAfterDiscount}
                />
                {chargesList.map((c) => (
                  <div key={c.key || c.description} className="flex justify-between items-center">
                    <span className="text-gray-700">{c.description || c.key || 'Platform Fee'}</span>
                    <span className="font-medium">
                      {c.amount != null && c.amount > 0 ? (
                        <>Rs {Number(c.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
                      ) : (
                        <span className="text-green-700 font-medium">Free</span>
                      )}
                    </span>
                  </div>
                ))}
                {isAuthenticated ? (
                  <BindOfferBillRows bindOffers={bindOffers} formatRsFn={formatRsDiscount} />
                ) : null}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Coupon</span>
                  <span className="font-medium">
                    {coupon?.discountAmount > 0 ? (
                      <>−{formatRs(coupon.discountAmount)}</>
                    ) : (
                      <span className="text-gray-500 font-normal">—</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Delivery</span>
                  <span className="font-medium">{deliverySummary?.totalCharge != null && deliverySummary.totalCharge > 0 ? formatRs(deliverySummary.totalCharge) : <span className="text-green-700 font-medium">Free</span>}</span>
                </div>
                {taxableAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Taxable amount</span>
                    <span className="font-medium">{formatRs(taxableAmount)}</span>
                  </div>
                )}
                {totalGst > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Total GST</span>
                    <span className="font-medium">{formatRs(totalGst)}</span>
                  </div>
                )}
                {donationLineAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Donation</span>
                    <span className="font-medium">{formatRs(donationLineAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-300">
                  <span className="font-bold text-black">Total</span>
                  <span className="font-bold text-base">
                    {coupon?.discountAmount > 0 && finalPayable < (summary.subTotal ?? 0) && (
                      <span className="text-gray-400 line-through mr-1 text-sm">Rs {Number(summary.subTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    )}
                    Rs {Number(finalPayable).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </section>

            <div className="pt-4 border-t border-gray-200">
              {!isAuthenticated ? (
                <Link
                  to={ROUTES.AUTH}
                  className="block w-full bg-black text-white py-3 px-4 text-center font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Sign in to check out
                </Link>
              ) : hasOutOfStockItem ? (
                <span
                  className="block w-full bg-gray-300 text-gray-500 py-3 px-4 text-center font-semibold uppercase cursor-not-allowed"
                  title="Remove out of stock items to proceed"
                >
                  Checkout (remove out of stock items)
                </span>
              ) : (
                <Link
                  to={ROUTES.CHECKOUT}
                  state={{
                    couponCode: appliedCouponCode || null,
                    selectedAddress: selectedAddress || null,
                    addresses: addresses?.length ? addresses : null,
                    donation: donationForCheckout,
                  }}
                  onClick={() => {
                    const ecommerceItems = items.map((row) => cartRowToEcommerceItem(row))
                    trackPixelBeginCheckoutOnce({
                      items: ecommerceItems,
                      value: finalPayable != null ? Number(finalPayable) : undefined,
                      currency: 'INR',
                      numItems: items.reduce((sum, row) => sum + Number(row?.quantity || 0), 0),
                    })
                    trackEvent({
                      eventType: 'checkout_started',
                      cartValue: finalPayable != null ? Number(finalPayable) : undefined,
                      currency: 'INR',
                      quantity: items.reduce((sum, row) => sum + Number(row?.quantity || 0), 0),
                    })
                  }}
                  className="block w-full bg-black text-white py-3 px-4 text-center font-semibold uppercase hover:bg-gray-800 transition-colors"
                >
                  Checkout
                </Link>
              )}
              <Link
                to={ROUTES.SEARCH}
                className="mt-3 block w-full text-center text-sm font-medium uppercase text-black hover:underline"
              >
                Continue shopping
              </Link>
              <Link
                to={ROUTES.WISHLIST}
                className="mt-2 block w-full text-center text-sm text-gray-600 hover:underline"
              >
                View wishlist
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
