import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../../app/context/AuthContext'
import { setLocation } from '../../app/store/slices/locationSlice'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { cartService } from '../../services/cart.service.js'
import { addressService } from '../../services/address.service.js'
import { deliveryService } from '../../services/delivery.service.js'
import { couponsService } from '../../services/coupons.service.js'
import { ROUTES, getProductPath } from '../../utils/constants'

function formatRs(num) {
  if (num == null || Number.isNaN(num)) return 'Rs 0'
  return `Rs ${Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`
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

function CartPage() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useAuth()
  const { removeFromCart, refetchCart } = useCartWishlist()
  const pincodeRedux = useSelector((s) => s?.location?.pincode) ?? null
  const selectedAddressIdFromRedux = useSelector((s) => s?.location?.selectedAddressId) ?? null
  const [cartData, setCartData] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState([])
  const [priceSummary, setPriceSummary] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState(null)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cartError, setCartError] = useState(null)
  const [couponError, setCouponError] = useState(null)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [addressFormLoading, setAddressFormLoading] = useState(false)
  const [addressFormError, setAddressFormError] = useState(null)
  const [addressForm, setAddressForm] = useState({
    name: '',
    phoneNumber: '',
    countryCode: '+91',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    addressType: 'HOME',
    isDefault: true,
  })

  const addressId = selectedAddress?._id
  const pincode = selectedAddress?.pinCode ?? pincodeRedux

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
  }, [])

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
    }).catch(() => {})
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

  // When cart items or coupon change, refresh price summary
  useEffect(() => {
    if (!cartData?.items?.length || !isAuthenticated) return
    fetchPriceSummary(appliedCouponCode || null)
  }, [cartData?.items?.length, appliedCouponCode, isAuthenticated])

  const handleIncreaseQty = async (sku) => {
    try {
      await cartService.increaseQty(sku)
      refetchCart({ addressId })
      const next = await fetchCart()
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) {}
  }

  const handleDecreaseQty = async (sku) => {
    try {
      await cartService.decreaseQty(sku)
      refetchCart({ addressId })
      const next = await fetchCart()
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) {}
  }

  const handleRemove = async (sku) => {
    try {
      await removeFromCart(sku)
      refetchCart({ addressId })
      const next = await fetchCart()
      setCartData(next)
      if (next?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (_) {}
  }

  const handleSelectDelivery = async (sku, deliveryId) => {
    try {
      await cartService.selectDelivery({ sku, deliveryId })
      refetchCart({ addressId })
      await fetchCart()
      fetchPriceSummary(appliedCouponCode || null)
    } catch (_) {}
  }

  const handleApplyCoupon = () => {
    const code = couponInput?.trim()
    if (!code) return
    setAppliedCouponCode(code)
    setCouponError(null)
    fetchPriceSummary(code)
  }

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null)
    setCouponInput('')
    setCouponError(null)
    fetchPriceSummary(null)
  }

  const openCouponModal = () => {
    setCouponModalOpen(true)
    setLoadingCoupons(true)
    setAvailableCoupons([])
    couponsService
      .getAvailable({ page: 1, limit: 50 })
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        const normalCoupons = (Array.isArray(list) ? list : []).filter((c) => !c?.isInfluencer)
        setAvailableCoupons(normalCoupons)
      })
      .catch(() => setAvailableCoupons([]))
      .finally(() => setLoadingCoupons(false))
  }

  const handleApplyCouponFromModal = (code) => {
    if (!code) return
    setCouponInput(code)
    setAppliedCouponCode(code)
    setCouponError(null)
    fetchPriceSummary(code)
    setCouponModalOpen(false)
  }

  const openAddressForm = () => {
    setAddressFormError(null)
    setAddressForm({
      name: '',
      phoneNumber: '',
      countryCode: '+91',
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
    setAddressForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault()
    setAddressFormError(null)
    const pin = String(addressForm.pinCode || '').trim().replace(/\D/g, '')
    if (!addressForm.name?.trim() || !addressForm.addressLine?.trim() || !addressForm.city?.trim() || !addressForm.state?.trim() || !pin) {
      setAddressFormError('Please fill name, address, city, state and pincode.')
      return
    }
    setAddressFormLoading(true)
    try {
      const payload = {
        name: addressForm.name.trim(),
        phoneNumber: (addressForm.phoneNumber || '').trim() || undefined,
        countryCode: (addressForm.countryCode || '+91').trim(),
        addressLine: addressForm.addressLine.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pinCode: parseInt(pin, 10) || 0,
        addressType: addressForm.addressType || 'HOME',
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

  const summary = priceSummary?.summary ?? {}
  const subTotal = cartData?.summary?.subTotal ?? priceSummary?.summary?.subTotal ?? 0
  const finalPayable = summary.finalPayable ?? subTotal
  const coupon = summary.coupon
  const deliverySummary = summary.delivery
  const otherChargesTotal = summary.otherChargesTotal ?? 0
  const chargesList = Array.isArray(summary.charges) ? summary.charges : []
  const taxableAmount = summary.taxableAmount ?? 0
  const totalGst = summary.gst?.totalGst ?? summary.totalGst ?? 0
  const subTotalAfterDiscount = summary.subTotalAfterDiscount ?? summary.subTotal ?? 0

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Your cart</h1>
          <p className="mt-2 text-gray-600">Please sign in to view your cart.</p>
          <Link to={ROUTES.AUTH} className="mt-6 inline-block px-6 py-3 bg-black text-white uppercase hover:bg-gray-800 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (loading && !cartData) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading cart…</p>
        </div>
      </div>
    )
  }

  const items = cartData?.items ?? []
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
            <div className="overflow-x-auto">
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
                                  {shortDesc && <p className="text-gray-600 text-sm mt-0.5 normal-case">{shortDesc}</p>}
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
                                  {shortDesc && <p className="text-gray-600 text-sm mt-0.5 normal-case">{shortDesc}</p>}
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
                              onClick={() => handleDecreaseQty(sku)}
                              className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-10 h-9 flex items-center justify-center border-x border-gray-200 text-sm bg-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleIncreaseQty(sku)}
                              className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="pl-4 py-4 text-right align-middle text-sm whitespace-nowrap">
                          Rs. {Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="pl-4 py-4 align-middle">
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
                        </td>
                        <td className="pl-2 py-4 align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemove(sku)}
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
                <p className="text-sm text-gray-500 mb-3">No address added. Add one to deliver.</p>
              )}
              <button
                type="button"
                onClick={openAddressForm}
                className="w-full border border-black py-2.5 px-4 text-sm font-medium uppercase bg-white text-black hover:bg-gray-50 transition-colors rounded-none"
              >
                Add new address
              </button>
            </section>

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
                      <input type="text" value={addressForm.name} onChange={(e) => handleAddressFormChange('name', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="Full name" required />
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Code</label>
                        <input type="text" value={addressForm.countryCode} onChange={(e) => handleAddressFormChange('countryCode', e.target.value)} className="w-full border border-gray-300 py-2 px-2 text-sm" placeholder="+91" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Phone</label>
                        <input type="text" value={addressForm.phoneNumber} onChange={(e) => handleAddressFormChange('phoneNumber', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="Phone number" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Address</label>
                      <input type="text" value={addressForm.addressLine} onChange={(e) => handleAddressFormChange('addressLine', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="Street, area, building" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">City</label>
                        <input type="text" value={addressForm.city} onChange={(e) => handleAddressFormChange('city', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="City" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-700 mb-1">State</label>
                        <input type="text" value={addressForm.state} onChange={(e) => handleAddressFormChange('state', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="State" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Pincode</label>
                      <input type="text" inputMode="numeric" value={addressForm.pinCode} onChange={(e) => handleAddressFormChange('pinCode', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm" placeholder="Pincode" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-700 mb-1">Type</label>
                      <select value={addressForm.addressType} onChange={(e) => handleAddressFormChange('addressType', e.target.value)} className="w-full border border-gray-300 py-2 px-3 text-sm bg-white">
                        <option value="HOME">Home</option>
                        <option value="WORK">Work</option>
                        <option value="OTHER">Other</option>
                      </select>
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

            {/* Coupons modal — larger, enhanced UI with Apply / Remove per coupon */}
            {couponModalOpen && (
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
                          const desc = c.description ?? ''
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

            {/* Bill Summary */}
            <section>
              <h2 className="text-sm font-semibold text-black mb-3">Bill Summary</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Item Total</span>
                  <span className="font-medium">
                    {coupon?.discountAmount > 0 && summary.subTotal != null && (
                      <span className="text-gray-400 line-through mr-1">Rs {Number(summary.subTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    )}
                    Rs {Number(subTotalAfterDiscount ?? summary.subTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Discount</span>
                  <span className="font-medium">
                    {coupon?.discountAmount > 0 ? (
                      <>−{formatRs(coupon.discountAmount)}</>
                    ) : (
                      <span className="text-green-700 font-medium">Free</span>
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
              {hasOutOfStockItem ? (
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
