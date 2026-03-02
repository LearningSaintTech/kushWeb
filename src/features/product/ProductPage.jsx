import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { FaTag } from 'react-icons/fa6'
import { RiFileList2Line, RiRefreshLine, RiTruckLine } from 'react-icons/ri'
import { HeartIcon } from '../../shared/ui/icons'
import { itemsService } from '../../services/items.service.js'
import { deliveryService } from '../../services/delivery.service.js'
import { useAuth } from '../../app/context/AuthContext'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { ROUTES } from '../../utils/constants'
import productImage from '../../assets/temporary/productimage.png'
import ReviewRating from './components/ReviewRating'

function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const { isAuthenticated, openAuthModal } = useAuth()
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlist()
  const [addedToCart, setAddedToCart] = useState(false)

  const [itemData, setItemData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [expandedSection, setExpandedSection] = useState('care')
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState([])

  // Fetch delivery options by pincode for dropdown
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

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('Invalid product')
      return
    }
    setLoading(true)
    setError(null)
    const params = pincode ? { pincode: String(pincode) } : {}
    itemsService
      .getById(id, params)
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const item = data?.item ?? data
        console.log('[ProductPage] product details API response:', { dataKeys: data ? Object.keys(data) : [], hasItem: !!item, itemId: item?._id, variantsCount: item?.variants?.length })
        if (item?.variants?.length) {
          item.variants.forEach((v, i) => {
            console.log('[ProductPage] API variant[' + i + ']:', { color: v.color?.name, sizesCount: v.sizes?.length, sizes: v.sizes?.map(s => ({ size: s.size, sku: s.sku, stock: s.stock, inStock: s.inStock, availableQuantity: s.availableQuantity })) })
          })
        }
        if (!item) {
          setError('Product not found')
          setItemData(null)
          return
        }
        setItemData({ item, deliveries: data?.deliveries ?? [] })
        const defaultColorName = item.defaultColor || item.variants?.[0]?.color?.name
        const firstSize = item.variants?.[0]?.sizes?.[0]?.size
        console.log('[ProductPage] set initial selectedColor:', defaultColorName, 'selectedSize:', firstSize)
        setSelectedColor(defaultColorName ?? null)
        setSelectedSize(firstSize ?? null)
        setSelectedImageIndex(0)
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load product')
        setItemData(null)
      })
      .finally(() => setLoading(false))
  }, [id, pincode])

  const item = itemData?.item
  const deliveries = itemData?.deliveries ?? []

  const colors = useMemo(() => {
    if (!item?.variants?.length) return []
    return item.variants.map((v) => ({
      id: v.color?.name,
      name: v.color?.name,
      value: v.color?.hex || '#666',
    }))
  }, [item])

  const selectedVariant = useMemo(() => {
    if (!item?.variants || !selectedColor) return null
    return item.variants.find((v) => v.color?.name === selectedColor) ?? item.variants[0]
  }, [item, selectedColor])

  const images = useMemo(() => {
    if (!selectedVariant?.images?.length) {
      return item?.thumbnail ? [item.thumbnail] : [productImage]
    }
    const sorted = [...selectedVariant.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return sorted.map((img) => img.url).filter(Boolean)
  }, [selectedVariant, item?.thumbnail])

  const sizes = useMemo(() => {
    if (!selectedVariant?.sizes?.length) return []
    return selectedVariant.sizes.map((s) => {
      const qty = Number(s.availableQuantity ?? s.stock ?? 0)
      const inStock = s.inStock === true || (s.inStock !== false && qty > 0)
      return {
        size: s.size,
        sku: s.sku,
        inStock,
      }
    })
  }, [selectedVariant])

  useEffect(() => {
    if (sizes.length && !sizes.some((s) => String(s.size).trim() === String(selectedSize).trim())) {
      setSelectedSize(sizes[0].size)
    }
  }, [sizes, selectedSize])

  const mainImage = images[selectedImageIndex] ?? images[0] ?? productImage

  const selectedSizeObj = sizes.find((s) => String(s.size).trim() === String(selectedSize).trim())

  const priceDisplay =
    item?.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : item?.price != null
        ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null

  // Prefer pincode-check delivery options; fallback to item API deliveries
  const deliveryOptions = deliveryOptionsFromPincode.length > 0 ? deliveryOptionsFromPincode : deliveries
  const deliveryText = useMemo(() => {
    if (deliveryOptions.some((d) => d.deliveryType === '90_MIN')) return '⊙ GET IN 90 min.'
    if (deliveryOptions.some((d) => d.deliveryType === 'ONE_DAY')) return '⊙ GET IN 1 day'
    return item?.shipping?.estimatedDelivery || item?.shipping?.title || '⊙ Check delivery'
  }, [deliveryOptions, item?.shipping])

  const productForCart = useMemo(() => {
    if (!item || !selectedVariant || !selectedSizeObj) return null
    const imageUrl = selectedVariant.images?.[0]?.url ?? item.thumbnail ?? ''
    return {
      id: item._id,
      _id: item._id,
      title: item.name,
      price: priceDisplay,
      image: imageUrl,
      hoverImage: imageUrl,
      delivery: deliveryText,
      rating: item.avgRating ?? 4,
      variant: {
        color: selectedVariant.color?.name ?? selectedColor,
        size: selectedSizeObj.size,
        sku: selectedSizeObj.sku,
        imageUrl,
      },
      sku: selectedSizeObj.sku,
    }
  }, [item, selectedVariant, selectedSizeObj, selectedColor, priceDisplay, deliveryText])

  console.log('[ProductPage] product details state:', {
    hasItem: !!item,
    itemId: item?._id,
    selectedColor,
    selectedSize,
    selectedVariant: !!selectedVariant,
    sizesCount: sizes.length,
    sizes,
    selectedSizeObj: selectedSizeObj ? { size: selectedSizeObj.size, sku: selectedSizeObj.sku, inStock: selectedSizeObj.inStock } : null,
    productForCart: productForCart ? { id: productForCart.id, sku: productForCart.sku } : null,
    buttonsDisabled: !productForCart || !selectedSizeObj?.inStock,
    whyDisabled: !item ? 'no item' : !selectedVariant ? 'no selectedVariant' : !selectedSizeObj ? 'no selectedSizeObj (selectedSize=' + selectedSize + ')' : !selectedSizeObj?.inStock ? 'selectedSizeObj.inStock is false' : 'ok',
  })

  const inWishlist = item?._id && isInWishlist(item._id)

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      openAuthModal()
      return
    }
    if (!productForCart || !selectedSizeObj?.inStock) return
    await addToCart(productForCart, pincode)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 4000)
  }

  const handleWishlist = () => {
    if (!isAuthenticated) {
      openAuthModal()
      return
    }
    if (!item) return
    toggleWishlist({
      id: item._id,
      title: item.name,
      price: priceDisplay,
      image: item.thumbnail ?? selectedVariant?.images?.[0]?.url,
      delivery: deliveryText,
      rating: item.avgRating ?? 4,
    })
  }

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      openAuthModal()
      return
    }
    if (!productForCart || !selectedSizeObj?.inStock) return
    await addToCart(productForCart, pincode)
    navigate(ROUTES.CART)
  }

  const toggleSection = (key) => {
    setExpandedSection((prev) => (prev === key ? null : key))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12 font-inter sm:pt-28 md:pt-32 md:pb-16 lg:pt-36 lg:pb-20">
        <div className="m-[6vw] flex items-center justify-center py-20">
          <p className="text-gray-500">Loading product…</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-100 pt-24 pb-12 font-inter sm:pt-28 md:pt-32 md:pb-16 lg:pt-36 lg:pb-20">
        <div className="m-[6vw] flex flex-col items-center justify-center py-20">
          <p className="text-gray-600">{error || 'Product not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-12 font-inter sm:pt-28 md:pt-32 md:pb-16 lg:pt-36 lg:pb-20">
      <div className="m-[6vw]">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[1fr_1fr] lg:gap-6 xl:grid-cols-[minmax(0,820px)_1fr] xl:gap-[2px]">

          {/* LEFT SIDE - Gallery */}
          <div className="w-full">
            <div className="w-full bg-white overflow-hidden sm:rounded-lg lg:rounded-none">
              <div className="aspect-4/3 w-full sm:aspect-4/3 lg:max-h-[620px] lg:aspect-3/4">
                <img
                  src={mainImage}
                  alt={item.name}
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide sm:gap-3 md:gap-4 lg:mt-5 lg:flex-wrap lg:overflow-visible">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-16 w-16 shrink-0 overflow-hidden border-2 bg-white sm:h-20 sm:w-20 md:h-24 md:w-28 lg:h-[142px] lg:w-[151px] lg:shrink-0 ${selectedImageIndex === idx ? 'border-black' : 'border-transparent'}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE - Details */}
          <div className="bg-[#f5f5f5] px-4 font-inter sm:px-6 md:px-8 lg:px-10 xl:px-[40px]">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-medium uppercase tracking-wide text-black sm:text-2xl sm:tracking-[4px] md:text-3xl md:tracking-[6px]">
                  {item.name}
                </h1>
                <p
                  className="font-inter mt-2 font-normal capitalize text-[#646464] wrap-break-word sm:mt-[10px]"
                  style={{ fontSize: 24 }}
                >
                  {item.shortDescription || ''}
                </p>
                <p className="mt-3 text-lg text-[#e07a5f] sm:mt-[14px] sm:text-xl md:text-[22px]">
                  {priceDisplay}
                </p>
              </div>
              <button
                type="button"
                onClick={handleWishlist}
                className="shrink-0 rounded p-2 hover:bg-black/5"
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <HeartIcon
                  className={`h-6 w-6 sm:h-7 sm:w-7 ${inWishlist ? 'fill-black text-black' : 'text-black'}`}
                />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:mt-[25px] md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-5">
                {colors.length > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm text-gray-700 sm:text-[15px]">Color</span>
                    <div className="flex gap-2 sm:gap-[12px]">
                      {colors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedColor(c.id)}
                          className={`box-border flex h-6 min-h-6 max-h-6 w-6 min-w-6 max-w-6 shrink-0 items-center justify-center rounded-full border-2 p-0 sm:h-[26px] sm:min-h-[26px] sm:max-h-[26px] sm:w-[26px] sm:min-w-[26px] sm:max-w-[26px] ${selectedColor === c.id ? 'border-[#e53935]' : 'border-gray-300'}`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm text-gray-700 sm:text-[15px]">Size</span>
                    <div className="flex gap-2 sm:gap-[10px]">
                      {sizes.map((s) => (
                        <button
                          key={s.sku}
                          type="button"
                          onClick={() => setSelectedSize(s.size)}
                          disabled={!s.inStock}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm sm:h-[36px] sm:w-[36px] sm:text-[14px] ${selectedSize === s.size
                            ? 'border-black bg-black text-white'
                            : s.inStock
                              ? 'border-gray-300 text-gray-600'
                              : 'cursor-not-allowed border-gray-200 text-gray-400'
                            }`}
                        >
                          {s.size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-left md:text-right">
                <div className="inline-block rounded-full bg-black px-3 py-1.5 text-xs text-white sm:px-[14px] sm:py-[5px] sm:text-[14px]">
                  ★ {item.avgRating != null ? Number(item.avgRating).toFixed(1) : '4.0'}
                </div>
                <div className="mt-2 text-xs text-gray-700 sm:mt-[10px] sm:text-[14px]">
                  {deliveryOptions.length > 0 ? (
                    <select
                      className="border border-gray-300 bg-white py-1 px-2 text-inherit cursor-pointer max-w-[200px] uppercase"
                      defaultValue=""
                      aria-label="Delivery option"
                    >
                      <option value="" disabled>Select delivery</option>
                      {deliveryOptions.map((opt) => {
                        const id = opt._id?.toString?.() ?? opt._id
                        const label = opt.deliveryType === '90_MIN'
                          ? '90 MIN'
                          : opt.deliveryType === 'ONE_DAY'
                            ? '1 DAY'
                            : opt.deliveryType || 'Standard'
                        const charge = opt.deliveryCharge != null ? ` — Rs ${Number(opt.deliveryCharge)}` : ''
                        return (
                          <option key={id} value={id}>
                            {label}{charge}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    deliveryText
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-b border-gray-300 md:mt-[30px]" />

            {/* DETAILS */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-5 text-left sm:py-6 md:py-[28px]"
                onClick={() => toggleSection('details')}
              >
                <span className="flex items-center gap-2 text-base font-bold uppercase tracking-wider sm:text-lg md:text-[20px] md:tracking-[3px]">
                  <RiFileList2Line className="h-4 w-4 shrink-0 text-gray-500 sm:h-5 sm:w-5" />
                  Details
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-[22px]">
                  {expandedSection === 'details' ? <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expandedSection === 'details' && item.longDescription ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-4 pt-0">
                    <p className="text-sm text-gray-700 sm:text-base">{item.longDescription || ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CARE */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-5 text-left sm:py-6 md:py-[28px]"
                onClick={() => toggleSection('care')}
              >
                <span className="flex items-center gap-2 text-base font-bold uppercase tracking-wider sm:text-lg md:text-[20px] md:tracking-[3px]">
                  <RiTruckLine className="h-4 w-4 shrink-0 text-gray-500 sm:h-5 sm:w-5" />
                  Care
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-[22px]">
                  {expandedSection === 'care' ? <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expandedSection === 'care' ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="mt-4 flex gap-3 sm:mt-5 md:mt-[20px] md:gap-[12px]">
                  <div className="shrink-0 text-gray-500">
                    <RiTruckLine className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 sm:text-base md:text-[16px]">
                      {item.shipping?.title || 'Free Flat Rate Shipping'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 sm:mt-[5px] sm:text-sm md:text-[15px]">
                      {item.shipping?.estimatedDelivery || 'Estimated delivery based on your pincode.'}
                    </p>
                    {item.care?.description && (
                      <p className="mt-2 text-sm text-gray-600">{item.care.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* COD POLICY */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-5 text-left sm:py-6 md:py-[28px]"
                onClick={() => toggleSection('cod')}
              >
                <span className="flex items-center gap-2 text-base font-bold uppercase tracking-wider sm:text-lg md:text-[20px] md:tracking-[3px]">
                  <FaTag className="h-4 w-4 shrink-0 text-gray-500 sm:h-5 sm:w-5" />
                  COD Policy
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-[22px]">
                  {expandedSection === 'cod' ? <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expandedSection === 'cod' && item.codPolicy?.text ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-4 pt-0">
                    <p className="text-sm text-gray-600 sm:text-base">{item.codPolicy?.text || ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RETURN POLICY */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-5 text-left sm:py-6 md:py-[28px]"
                onClick={() => toggleSection('return')}
              >
                <span className="flex items-center gap-2 text-base font-bold uppercase tracking-wider sm:text-lg md:text-[20px] md:tracking-[3px]">
                  <RiRefreshLine className="h-4 w-4 shrink-0 text-gray-500 sm:h-5 sm:w-5" />
                  Return Policy
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-[22px]">
                  {expandedSection === 'return' ? <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: expandedSection === 'return' && item.returnPolicy?.text ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-4 pt-0">
                    <p className="text-sm text-gray-600 sm:text-base">{item.returnPolicy?.text || ''}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4 md:mt-12 lg:mt-[50px] lg:gap-[25px]">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!productForCart}
                className="h-12 w-full bg-black text-sm font-medium uppercase tracking-wider text-white sm:h-14 md:h-[64px] md:text-[16px] md:tracking-[2px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy It Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!productForCart}
                className="h-12 w-full border border-black text-sm font-medium uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 md:h-[64px] md:text-[16px] md:tracking-[2px]"
              >
                {addedToCart ? 'Added' : 'Add To Cart'}
              </button>
              {addedToCart && (
                <Link
                  to={ROUTES.CART}
                  className="h-12 w-full flex items-center justify-center border border-black text-sm font-medium uppercase tracking-wider text-black sm:h-14 md:h-[64px] md:text-[16px] md:tracking-[2px]"
                >
                  View Cart
                </Link>
              )}
            </div>
          </div>
        </div>

        <ReviewRating itemId={item._id} />
      </div>
    </div>
  )
}

export default ProductPage
