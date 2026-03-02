import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { cartService } from '../../services/cart.service.js'
import { addressService } from '../../services/address.service.js'
import { deliveryService } from '../../services/delivery.service.js'
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

function CheckoutPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const couponCodeFromCart = location.state?.couponCode ?? null

  const [cartData, setCartData] = useState(null)
  const [priceSummary, setPriceSummary] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [deliveryOptions, setDeliveryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const addressId = selectedAddress?._id
  const pincode = selectedAddress?.pinCode ?? null

  const fetchAddresses = useCallback(async () => {
    const defaultRes = await addressService.getDefaultAddress().catch(() => null)
    const defaultAddr = defaultRes?.data?.data ?? defaultRes?.data
    const allRes = await addressService.getAll({ page: 1, limit: 50 })
    const list = allRes?.data?.data ?? allRes?.data
    const arr = Array.isArray(list) ? list : (list?.addresses ?? list?.data ?? [])
    const addressList = Array.isArray(arr) ? arr : []
    setAddresses(addressList)
    if (defaultAddr) setSelectedAddress(defaultAddr)
    else if (addressList.length) setSelectedAddress(addressList[0])
    return { defaultAddr, addressList }
  }, [])

  const fetchDeliveryOptions = useCallback(async (pin) => {
    if (!pin || !String(pin).trim()) return []
    const res = await deliveryService.checkByPincode(String(pin).trim()).catch(() => ({}))
    const data = res?.data?.data ?? res?.data
    const options = data?.deliveryOptions ?? []
    return Array.isArray(options) ? options : []
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchAddresses()
      .then(({ defaultAddr, addressList }) => {
        const id = defaultAddr?._id ?? addressList?.[0]?._id
        const cartParams = { limit: 100 }
        if (id) cartParams.addressId = id
        return cartService.my(cartParams)
      })
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        console.log('[Checkout] GET /cart/my response:', data)
        setCartData(data)
        const params = couponCodeFromCart ? { couponCode: couponCodeFromCart } : {}
        return cartService.getPriceSummary(params)
      })
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const summaryOnly = data?.cartSummary?.summary ?? data?.summary ?? data
        console.log('[Checkout] GET /cart/price-summary response (summary):', summaryOnly)
        setPriceSummary(data)
        return data
      })
      .catch((err) => setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load checkout'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, couponCodeFromCart])

  useEffect(() => {
    if (!pincode) {
      setDeliveryOptions([])
      return
    }
    fetchDeliveryOptions(pincode).then(setDeliveryOptions)
  }, [pincode, fetchDeliveryOptions])

  // Summary from price-summary API (cartSummary.summary)
  const summary = priceSummary?.cartSummary?.summary ?? priceSummary?.summary ?? {}
  const subTotal = summary.subTotal ?? cartData?.summary?.subTotal ?? 0
  const finalPayable = summary.finalPayable ?? subTotal
  const coupon = summary.coupon
  const deliverySummary = summary.delivery
  const otherChargesTotal = summary.otherChargesTotal ?? 0
  const totalGst = summary.gst?.totalGst ?? summary.totalGst ?? 0
  const chargesList = Array.isArray(summary.charges) ? summary.charges : []
  const taxableAmount = summary.taxableAmount ?? 0
  const subTotalAfterDiscount = summary.subTotalAfterDiscount ?? summary.subTotal ?? 0
  const hasSummaryFromApi = Boolean(priceSummary?.cartSummary?.summary ?? priceSummary?.summary)

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
  if (items.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Your cart is empty</h1>
          <p className="mt-2 text-gray-600">Add items to proceed to checkout.</p>
          <Link to={ROUTES.SEARCH} className="mt-6 inline-block px-6 py-3 bg-black text-white uppercase hover:bg-gray-800 transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <h1 className="text-xl font-bold uppercase tracking-wider text-black mb-6">Checkout</h1>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left: Order items (same format as cart, read-only) */}
          <div className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 1.5rem' }}>
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-center">Quantity</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const item = row.itemId
                    const name = item?.name ?? 'Product'
                    const shortDesc = item?.shortDescription ?? ''
                    const color = row.variant?.color ?? ''
                    const imageUrl = row.variant?.imageUrl ?? ''
                    const sku = row.variant?.sku
                    const qty = row.quantity ?? 1
                    const unitPrice = row.unitPrice ?? (item?.discountedPrice ?? item?.price ?? 0)
                    const itemTotal = row.itemTotal ?? unitPrice * qty
                    const selectedDeliveryId = row.selectedDeliveryId?.toString?.() ?? row.selectedDeliveryId
                    const selectedOpt = deliveryOptions.find((d) => (d._id?.toString?.() ?? d._id) === selectedDeliveryId)
                    const deliveryLabel = selectedOpt?.deliveryType === '90_MIN' ? '90 MIN' : selectedOpt?.deliveryType === 'ONE_DAY' ? '1 DAY' : selectedOpt?.deliveryType || 'Standard'
                    const productId = item?._id
                    const productPath = productId ? getProductPath(productId) : null

                    return (
                      <tr key={row._id ?? sku} className="align-top">
                        <td className="pr-4">
                          <div className="flex gap-4">
                            <div className="w-24 h-24 shrink-0 overflow-hidden bg-gray-100">
                              {productPath ? (
                                <Link to={productPath} className="block w-full h-full">
                                  {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>}
                                </Link>
                              ) : imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                              )}
                            </div>
                            <div>
                              {productPath ? (
                                <Link to={productPath} className="block hover:underline">
                                  <p className="font-semibold text-black uppercase tracking-wide">{name}</p>
                                  {shortDesc && <p className="text-sm text-gray-600 mt-0.5">{shortDesc}</p>}
                                  {color && <p className="text-sm text-gray-600 mt-0.5">{color}</p>}
                                </Link>
                              ) : (
                                <>
                                  <p className="font-semibold text-black uppercase tracking-wide">{name}</p>
                                  {shortDesc && <p className="text-sm text-gray-600 mt-0.5">{shortDesc}</p>}
                                  {color && <p className="text-sm text-gray-600 mt-0.5">{color}</p>}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 text-center align-middle text-sm">{qty}</td>
                        <td className="pl-4 text-right align-middle font-medium whitespace-nowrap">{formatRs(itemTotal)}</td>
                        <td className="pl-4 text-sm text-gray-700">{deliveryLabel}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Delivery to, Coupon, Bill summary (same as cart) */}
          <div className="lg:col-span-1 space-y-6">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-black mb-2">Delivery to</h2>
              {selectedAddress ? (
                <>
                  <p className="font-medium uppercase text-black">{selectedAddress.name}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{formatAddress(selectedAddress)}</p>
                  {(selectedAddress.phoneNumber || selectedAddress.countryCode) && (
                    <p className="text-xs uppercase text-gray-600 mt-1">
                      Contact: {[selectedAddress.countryCode, selectedAddress.phoneNumber].filter(Boolean).join(' ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No address selected</p>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-black mb-2">Coupon</h2>
              {coupon?.code ? (
                <p className="text-sm font-medium text-black">{coupon.code} applied · −{formatRs(coupon.discountAmount)}</p>
              ) : couponCodeFromCart ? (
                <p className="text-sm text-gray-500">Coupon {couponCodeFromCart} (no discount applied)</p>
              ) : (
                <p className="text-sm text-gray-500">No coupon applied</p>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-black mb-3">Bill summary</h2>
              {!hasSummaryFromApi && loading ? (
                <p className="text-sm text-gray-500">Loading summary…</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Item total</span>
                    <span className="font-medium">{formatRs(summary.subTotal)}</span>
                  </div>
                  {coupon?.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Coupon discount ({coupon.code})</span>
                        <span className="font-medium">−{formatRs(coupon.discountAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Subtotal after discount</span>
                        <span className="font-medium">{formatRs(subTotalAfterDiscount)}</span>
                      </div>
                    </>
                  )}
                  {chargesList.map((c) => (
                    <div key={c.key || c.description} className="flex justify-between items-center">
                      <span className="text-gray-700">{c.description || c.key || 'Charge'}</span>
                      <span className="font-medium">{formatRs(c.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Delivery</span>
                    <span className="font-medium">{deliverySummary?.totalCharge != null && deliverySummary.totalCharge > 0 ? formatRs(deliverySummary.totalCharge) : 'Free'}</span>
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
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold uppercase">Amount to pay</span>
                    <span className="font-bold text-lg">{formatRs(finalPayable)}</span>
                  </div>
                </div>
              )}
            </section>

            <div className="pt-4 border-t border-gray-200">
              <button type="button" className="w-full bg-black text-white py-3 px-4 font-semibold uppercase hover:bg-gray-800 transition-colors" disabled>
                Place order (coming soon)
              </button>
              <Link to={ROUTES.CART} className="mt-3 block w-full text-center text-sm font-medium uppercase text-black hover:underline">
                Back to cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
