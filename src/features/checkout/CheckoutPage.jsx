import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { cartService } from '../../services/cart.service.js'
import { addressService } from '../../services/address.service.js'
import { deliveryService } from '../../services/delivery.service.js'
import { couponsService } from '../../services/coupons.service.js'
import { orderService } from '../../services/order.service.js'
import { getPublicImageUrl } from '../../services/config.js'
import { ROUTES, getProductPath } from '../../utils/constants'

/** Load Razorpay checkout script once. */
function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

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

function CheckoutPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const cartState = location.state ?? {}
  const couponCodeFromCart = cartState.couponCode ?? null
  const selectedAddressFromCart = cartState.selectedAddress ?? null
  const addressesFromCart = Array.isArray(cartState.addresses) ? cartState.addresses : []

  const [cartData, setCartData] = useState(null)
  const [priceSummary, setPriceSummary] = useState(null)
  const [addresses, setAddresses] = useState(addressesFromCart)
  const [selectedAddress, setSelectedAddress] = useState(selectedAddressFromCart)
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState([])
  const [couponInput, setCouponInput] = useState(couponCodeFromCart || '')
  const [appliedCouponCode, setAppliedCouponCode] = useState(couponCodeFromCart)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
  const [paymentMode, setPaymentMode] = useState('COD')
  const [placeOrderLoading, setPlaceOrderLoading] = useState(false)

  const navigate = useNavigate()
  const addressId = selectedAddress?._id
  const pincode = selectedAddress?.pinCode ?? null

  useEffect(() => {
    console.log('[Checkout] mount', { isAuthenticated, addressId, pincode, paymentMode, cartItemsCount: cartData?.items?.length ?? 0 })
    return () => console.log('[Checkout] unmount')
  }, [])

  const refetchAddresses = useCallback(async () => {
    const req = { page: 1, limit: 50 }
    console.log('[Checkout] REQ addressService.getAll:', req)
    const res = await addressService.getAll(req)
    console.log('[Checkout] RES addressService.getAll:', res?.data)
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
    console.log('[Checkout] REQ cartService.my:', params)
    const res = await cartService.my(params)
    console.log('[Checkout] RES cartService.my:', res?.data)
    const data = res?.data?.data ?? res?.data
    setCartData(data)
    return data
  }, [addressId, pincode])

  const fetchPriceSummary = useCallback(async (couponCode = null) => {
    try {
      const params = couponCode ? { couponCode } : {}
      console.log('[Checkout] REQ cartService.getPriceSummary:', params)
      const res = await cartService.getPriceSummary(params)
      console.log('[Checkout] RES cartService.getPriceSummary:', res?.data)
      const data = res?.data?.data ?? res?.data
      setPriceSummary(data?.cartSummary ?? data)
      setCouponError(null)
      return data
    } catch (err) {
      console.log('[Checkout] ERR cartService.getPriceSummary:', err?.response?.data ?? err?.message)
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to get price summary'
      setCouponError(msg)
      setPriceSummary(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const fromCart = selectedAddressFromCart != null
    let defaultAddr = null
    let addressList = []
    console.log('[Checkout] REQ addressService.getDefaultAddress')
    addressService
      .getDefaultAddress()
      .then((res) => {
        console.log('[Checkout] RES addressService.getDefaultAddress:', res?.data)
        const data = res?.data?.data ?? res?.data
        defaultAddr = data
        if (!fromCart && data) setSelectedAddress(data)
        return data
      })
      .catch(() => null)
      .then(() => {
        const req = { page: 1, limit: 50 }
        console.log('[Checkout] REQ addressService.getAll (init):', req)
        return addressService.getAll(req).then((res) => {
          console.log('[Checkout] RES addressService.getAll (init):', res?.data)
          const list = res?.data?.data ?? res?.data
          const arr = Array.isArray(list) ? list : (list?.addresses ?? list?.data ?? [])
          addressList = Array.isArray(arr) ? arr : []
          setAddresses(addressList)
          if (fromCart && selectedAddressFromCart?._id != null) {
            const found = addressList.find((a) => String(a._id ?? '') === String(selectedAddressFromCart._id))
            if (found) setSelectedAddress(found)
            else setSelectedAddress(selectedAddressFromCart)
          } else if (!fromCart && !defaultAddr && addressList.length) setSelectedAddress(addressList[0])
          return addressList
        })
      }).catch(() => [])
      .then((list) => {
        const fromCartId = fromCart && selectedAddressFromCart?._id != null ? selectedAddressFromCart._id : null
        const id = fromCartId ?? defaultAddr?._id ?? list?.[0]?._id
        const cartParams = { limit: 100 }
        if (id) cartParams.addressId = id
        console.log('[Checkout] REQ cartService.my (init):', cartParams)
        return cartService.my(cartParams)
      })
      .then((res) => {
        console.log('[Checkout] RES cartService.my (init):', res?.data)
        const data = res?.data?.data ?? res?.data
        setCartData(data)
        if (data?.items?.length) return fetchPriceSummary(appliedCouponCode || couponCodeFromCart || null)
      })
      .catch((err) => setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load checkout'))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  useEffect(() => {
    if (addresses.length === 0 || selectedAddress != null) return
    const defaultOrFirst = addresses.find((a) => a.isDefault) ?? addresses[0]
    if (defaultOrFirst) setSelectedAddress(defaultOrFirst)
  }, [addresses, selectedAddress])

  useEffect(() => {
    if (!isAuthenticated || !addressId) return
    const params = { limit: 100, addressId }
    console.log('[Checkout] REQ cartService.my (addressId changed):', params)
    cartService.my(params).then((res) => {
      console.log('[Checkout] RES cartService.my (addressId changed):', res?.data)
      const data = res?.data?.data ?? res?.data
      setCartData(data)
      if (data?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    }).catch(() => {})
  }, [addressId, isAuthenticated])

  useEffect(() => {
    if (!pincode || !String(pincode).trim()) {
      setDeliveryOptionsFromPincode([])
      return
    }
    const pincodeStr = String(pincode).trim()
    console.log('[Checkout] REQ deliveryService.checkByPincode:', { pincode: pincodeStr })
    deliveryService
      .checkByPincode(pincodeStr)
      .then((res) => {
        console.log('[Checkout] RES deliveryService.checkByPincode:', res?.data)
        const data = res?.data?.data ?? res?.data
        const options = data?.deliveryOptions ?? []
        setDeliveryOptionsFromPincode(Array.isArray(options) ? options : [])
      })
      .catch(() => setDeliveryOptionsFromPincode([]))
  }, [pincode])

  useEffect(() => {
    if (!cartData?.items?.length || !isAuthenticated) return
    fetchPriceSummary(appliedCouponCode || null)
  }, [cartData?.items?.length, appliedCouponCode, isAuthenticated])

  const handleApplyCoupon = () => {
    const code = couponInput?.trim()
    if (!code) return
    setAppliedCouponCode(code)
    setCouponError(null)
    fetchPriceSummary(code)
  }

  const openCouponModal = () => {
    setCouponModalOpen(true)
    setLoadingCoupons(true)
    setAvailableCoupons([])
    const req = { page: 1, limit: 50 }
    console.log('[Checkout] REQ couponsService.getAvailable:', req)
    couponsService
      .getAvailable(req)
      .then((res) => {
        console.log('[Checkout] RES couponsService.getAvailable:', res?.data)
        const data = res?.data?.data ?? res?.data
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        setAvailableCoupons(list)
      })
      .catch(() => setAvailableCoupons([]))
      .finally(() => setLoadingCoupons(false))
  }

  const handleSelectCoupon = (code) => {
    if (code) {
      setCouponInput(code)
      setAppliedCouponCode(code)
      setCouponError(null)
      fetchPriceSummary(code)
    }
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
      console.log('[Checkout] REQ addressService.create:', payload)
      const res = await addressService.create(payload)
      console.log('[Checkout] RES addressService.create:', res?.data)
      const newAddr = res?.data?.data ?? res?.data
      const list = await refetchAddresses()
      if (newAddr?._id) setSelectedAddress(newAddr)
      else if (list?.length) setSelectedAddress(list[list.length - 1])
      setAddressFormOpen(false)
      if (cartData?.items?.length) fetchPriceSummary(appliedCouponCode || null)
    } catch (err) {
      console.log('[Checkout] ERR addressService.create:', err?.response?.data ?? err?.message)
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to add address.'
      setAddressFormError(msg)
    } finally {
      setAddressFormLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    console.log('[Checkout] handlePlaceOrder called', { paymentMode, selectedAddressId: selectedAddress?._id, appliedCouponCode })
    if (!selectedAddress?._id) {
      setError('Please select a delivery address.')
      return
    }
    setPlaceOrderLoading(true)
    setError(null)
    const addressId = selectedAddress._id
    const couponCode = appliedCouponCode?.trim() || undefined

    try {
      if (paymentMode === 'COD') {
        const createReq = { addressId, paymentMode: 'COD', couponCode }
        console.log('[Checkout] REQ orderService.create (COD):', createReq)
        const res = await orderService.create(createReq)
        console.log('[Checkout] RES orderService.create (COD):', res?.data)
        const data = res?.data?.data ?? res?.data
        const order = data?.order ?? data
        const orderId = order?.orderId
        console.log('[Checkout] COD success, navigating to orders', { orderId })
        navigate(ROUTES.ORDERS, { state: { orderId, orderSuccess: true } })
        return
      }

      // RAZORPAY: Order is CREATED first. After user pays in the popup, payment.success
      // fires and we call verifyPayment → order becomes CONFIRMED. If the callback never
      // runs (popup closed, CORS/HTTPS issues with localhost, or Razorpay errors), order stays CREATED.
      if (paymentMode === 'RAZORPAY') {
        const createReq = { addressId, paymentMode: 'RAZORPAY', couponCode }
        console.log('[Checkout] REQ orderService.create (RAZORPAY):', createReq)
        const res = await orderService.create(createReq)
        console.log('[Checkout] RES orderService.create (RAZORPAY):', res?.data)
        const data = res?.data?.data ?? res?.data
        const order = data?.order ?? data
        const razorpayPayload = data?.razorpay
        console.log('[Checkout] razorpayPayload (amount in rupees for frontend):', razorpayPayload)
        if (!razorpayPayload?.orderId || !razorpayPayload?.keyId) {
          console.log('[Checkout] Razorpay payload missing orderId or keyId', razorpayPayload)
          setError('Payment setup failed. Please try again.')
          setPlaceOrderLoading(false)
          return
        }
        console.log('[Checkout] Loading Razorpay script…')
        await loadRazorpayScript()
        const amountInPaise = Math.round((razorpayPayload.amount || 0) * 100)
        console.log('[Checkout] Razorpay open options: amount (paise)=', amountInPaise, 'amount (rupees)=', razorpayPayload.amount, 'orderId=', razorpayPayload.orderId)

        const handlePaymentSuccess = async function (response) {
          console.log('[Checkout] Razorpay payment.success callback fired', { razorpay_order_id: response?.razorpay_order_id, razorpay_payment_id: response?.razorpay_payment_id })
          const verifyReq = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }
          console.log('[Checkout] REQ orderService.verifyPayment:', { ...verifyReq, razorpay_signature: '(redacted)' })
          try {
            const verifyRes = await orderService.verifyPayment(verifyReq)
            console.log('[Checkout] RES orderService.verifyPayment:', verifyRes?.data)
            const orderId = order?.orderId
            console.log('[Checkout] Verify success, navigating to orders', { orderId })
            navigate(ROUTES.ORDERS, { state: { orderId, orderSuccess: true } })
          } catch (verifyErr) {
            console.log('[Checkout] ERR orderService.verifyPayment:', verifyErr?.response?.data ?? verifyErr?.message, verifyErr)
            setError(verifyErr?.response?.data?.message ?? verifyErr?.message ?? 'Payment verification failed.')
          } finally {
            setPlaceOrderLoading(false)
          }
        }

        // Only pass these options (do not spread razorpayPayload – avoids passing localhost image URLs to Razorpay)
        const options = {
          order_id: razorpayPayload.orderId,
          amount: amountInPaise,
          currency: razorpayPayload.currency || 'INR',
          key: razorpayPayload.keyId,
          name: 'Khush',
          handler: handlePaymentSuccess,
        }
        const rzp = new window.Razorpay({
          key: razorpayPayload.keyId,
        })
        rzp.on('payment.success', handlePaymentSuccess)
        rzp.on('payment.failed', () => {
          console.log('[Checkout] Razorpay payment.failed or user closed popup')
          setError('Payment failed or was cancelled.')
          setPlaceOrderLoading(false)
        })
        rzp.on('modal_close', () => {
          console.log('[Checkout] Razorpay modal closed without completing payment')
          setPlaceOrderLoading(false)
        })
        console.log('[Checkout] Opening Razorpay checkout', { order_id: options.order_id, amount: options.amount, currency: options.currency })
        rzp.open(options)
        return
      }
    } catch (err) {
      console.log('[Checkout] ERR orderService.create:', err?.response?.data ?? err?.message, err)
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to place order.'
      setError(msg)
    } finally {
      if (paymentMode === 'COD') setPlaceOrderLoading(false)
    }
  }

  // Summary from price-summary API (cartSummary.summary)
  const summary = priceSummary?.cartSummary?.summary ?? priceSummary?.summary ?? priceSummary ?? {}
  const subTotal = cartData?.summary?.subTotal ?? summary.subTotal ?? 0
  const finalPayable = summary.finalPayable ?? subTotal
  const coupon = summary.coupon
  const deliverySummary = summary.delivery
  const otherChargesTotal = summary.otherChargesTotal ?? 0
  const totalGst = summary.gst?.totalGst ?? summary.totalGst ?? 0
  const chargesList = Array.isArray(summary.charges) ? summary.charges : []
  const taxableAmount = summary.taxableAmount ?? 0
  const subTotalAfterDiscount = summary.subTotalAfterDiscount ?? summary.subTotal ?? 0
  const hasSummaryFromApi = Boolean(priceSummary?.cartSummary ?? priceSummary?.summary)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Checkout</h1>
          <p className="mt-2 text-gray-600">Please sign in to checkout.</p>
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
          <p className="text-gray-600">Loading checkout…</p>
        </div>
      </div>
    )
  }

  const items = cartData?.items ?? []
  const deliveryOptions = deliveryOptionsFromPincode.length > 0 ? deliveryOptionsFromPincode : (cartData?.deliveryOptions ?? [])

  if (items.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Your cart is empty</h1>
          <p className="mt-2 text-gray-600">Add items from the shop to get started.</p>
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
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left column: Order items (read-only, same table as cart) */}
          <div className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Product</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Quantity</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Total</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-800 border border-gray-300 text-center">Delivery time</th>
                    <th className="py-3 px-4 w-10 border border-gray-300 bg-gray-100" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const item = row.itemId
                    const name = item?.name ?? 'Product'
                    const shortDesc = item?.shortDescription ?? ''
                    const color = row.variant?.color ?? ''
                    const imageUrl = getPublicImageUrl(row.variant?.imageUrl ?? '')
                    const sku = row.variant?.sku
                    const qty = row.quantity ?? 1
                    const unitPrice = row.unitPrice ?? (item?.discountedPrice ?? item?.price ?? 0)
                    const itemTotal = row.itemTotal ?? unitPrice * qty
                    const selectedDeliveryId = row.selectedDeliveryId?.toString?.() ?? row.selectedDeliveryId
                    const selectedOpt = deliveryOptions.find((d) => (d._id?.toString?.() ?? d._id) === selectedDeliveryId)
                    const deliveryLabel = selectedOpt?.deliveryType === '90_MIN' ? '90 MIN DELIVERY' : selectedOpt?.deliveryType === 'ONE_DAY' ? '1 DAY DELIVERY' : selectedOpt?.deliveryType || 'Standard'
                    const productId = item?._id
                    const productPath = productId ? getProductPath(productId) : null

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
                                  <p className="text-gray-600 text-sm mt-0.5 normal-case">{shortDesc || color || ''}</p>
                                </Link>
                              ) : (
                                <>
                                  <p className="font-bold text-black uppercase tracking-wide text-sm">{name}</p>
                                  <p className="text-gray-600 text-sm mt-0.5 normal-case">{shortDesc || color || ''}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center align-middle">
                          <div className="inline-flex items-center bg-gray-100 border border-gray-200 rounded-md overflow-hidden">
                            <span className="w-10 h-9 flex items-center justify-center border-x border-gray-200 text-sm bg-white">{qty}</span>
                          </div>
                        </td>
                        <td className="pl-4 py-4 text-right align-middle text-sm whitespace-nowrap">
                          Rs. {Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="pl-4 py-4 align-middle text-sm text-gray-700">{deliveryLabel}</td>
                        <td className="pl-2 py-4 align-middle" />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column: Delivery, Coupon, Bill Summary (same as cart) */}
          <div className="lg:col-span-1 space-y-6 border border-gray-300 p-5 bg-white">
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
                      if (addr) setSelectedAddress(addr)
                    }}
                    className="w-full border border-gray-300 py-2 px-3 text-sm mb-3 bg-white rounded-none"
                  >
                    {addresses.map((addr) => (
                      <option key={addr._id} value={String(addr._id ?? '')}>
                        {addr.name} – {addr.addressLine}
                      </option>
                    ))}
                  </select>
                  {/* Selected address details below dropdown — always visible when we have addresses */}
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
                  <form onSubmit={handleAddressFormSubmit} className="overflow-y-auto p-4 flex-1 space-y-3">
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
            </section>

            {/* Coupons modal */}
            {couponModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCouponModalOpen(false)}>
                <div className="bg-white w-full max-w-md max-h-[80vh] flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-black">All coupons</h3>
                    <button type="button" onClick={() => setCouponModalOpen(false)} className="p-2 text-gray-500 hover:text-black" aria-label="Close">×</button>
                  </div>
                  <div className="overflow-y-auto p-4 flex-1">
                    {loadingCoupons ? (
                      <p className="text-sm text-gray-500 text-center py-6">Loading coupons…</p>
                    ) : availableCoupons.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">No coupons available.</p>
                    ) : (
                      <ul className="space-y-3">
                        {availableCoupons.map((c) => {
                          const code = c.code ?? ''
                          const desc = c.description ?? ''
                          const type = (c.discountType || '').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FLAT'
                          const value = c.discountValue ?? 0
                          const maxDiscount = c.maxDiscountAmount
                          const minCart = c.minCartValue ?? 0
                          const maxCart = c.maxCartValue
                          const perUserLimit = c.perUserUsageLimit ?? 0
                          const expiryDate = formatCouponDate(c.expiryDate)
                          const discountLabel = type === 'PERCENT'
                            ? `${value}% off${maxDiscount ? ` (max Rs ${Number(maxDiscount).toLocaleString('en-IN')})` : ''}`
                            : `Rs ${Number(value).toLocaleString('en-IN')} off`
                          return (
                            <li key={c._id ?? code}>
                              <button
                                type="button"
                                onClick={() => handleSelectCoupon(code)}
                                className="w-full text-left border border-gray-300 p-4 hover:border-black hover:bg-gray-50 transition-colors"
                              >
                                <span className="block font-semibold uppercase text-black">{code}</span>
                                {desc && <span className="block text-sm text-gray-700 mt-1">{desc}</span>}
                                <span className="block text-sm font-medium text-gray-800 mt-1">{discountLabel}</span>
                                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                                  {minCart > 0 && <p>Min order: Rs {Number(minCart).toLocaleString('en-IN')}</p>}
                                  {maxCart != null && maxCart > 0 && <p>Valid on orders up to Rs {Number(maxCart).toLocaleString('en-IN')}</p>}
                                  {expiryDate && <p>Valid till: {expiryDate}</p>}
                                  {perUserLimit > 0 && <p>{perUserLimit === 1 ? 'One use per user' : `Use up to ${perUserLimit} times per user`}</p>}
                                </div>
                              </button>
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
              {!hasSummaryFromApi && loading ? (
                <p className="text-sm text-gray-500">Loading summary…</p>
              ) : (
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
              )}
            </section>

            {/* Payment method */}
            <section>
              <h2 className="text-sm font-semibold text-black mb-2">Payment method</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="COD"
                    checked={paymentMode === 'COD'}
                    onChange={() => setPaymentMode('COD')}
                    className="border-gray-300"
                  />
                  <span className="text-sm uppercase">Cash on delivery (COD)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="RAZORPAY"
                    checked={paymentMode === 'RAZORPAY'}
                    onChange={() => setPaymentMode('RAZORPAY')}
                    className="border-gray-300"
                  />
                  <span className="text-sm uppercase">Online payment</span>
                </label>
              </div>
            </section>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placeOrderLoading || !selectedAddress?._id}
                className="block w-full bg-black text-white py-3 px-4 text-center font-semibold uppercase hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {placeOrderLoading ? 'Placing order…' : 'Place order'}
              </button>
              <Link
                to={ROUTES.CART}
                className="mt-3 block w-full text-center text-sm font-medium uppercase text-black hover:underline"
              >
                Back to cart
              </Link>
              <Link
                to={ROUTES.SEARCH}
                className="mt-2 block w-full text-center text-sm text-gray-600 hover:underline"
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

export default CheckoutPage
