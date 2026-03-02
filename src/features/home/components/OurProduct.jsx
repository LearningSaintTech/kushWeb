import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProductCard from '../../../shared/components/ProductCard'
import productImage from '../../../assets/temporary/productimage.png'
import hoverProductImage from '../../../assets/temporary/hoverProductImage.png'
import { IoChevronForward } from "react-icons/io5"
import { itemsService } from '../../../services/items.service.js'
import { categoriesService } from '../../../services/categories.service.js'

const CATEGORIES = ['MEN', 'WOMEN', 'UNISEX', 'COUPLES']
const CATEGORY_PRODUCT_LIMIT = 8

const PRODUCTS_STATIC = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  image: productImage,
  hoverImage: hoverProductImage,
  title: 'DENIM JACKET',
  price: '₹1500.00',
  delivery: 'GET IN 6-7 days',
  rating: 4.5,
}))

function itemToCardProps(item, index) {
  const id = item._id ?? item.id ?? index
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = sorted[0]?.url ?? item.thumbnail ?? productImage
  const hoverUrl = sorted[1]?.url ?? imageUrl ?? hoverProductImage
  const price = item.discountedPrice != null
    ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '₹0.00'
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min delivery'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day delivery'
      : item.deliveryType ? String(item.deliveryType) : 'GET IN 6-7 days'
  return {
    id,
    image: imageUrl,
    hoverImage: hoverUrl,
    title: item.name ?? 'Product',
    price,
    delivery,
    rating: item.avgRating ?? 4.5,
  }
}

function OurProduct({ section }) {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [sectionCategoriesResolved, setSectionCategoriesResolved] = useState([])

  const hasPopulatedCategories = section?.categories?.length > 0
  const hasCategoryIds = Array.isArray(section?.categoryId) && section.categoryId.length > 0

  useEffect(() => {
    if (!section || (section.categories?.length ?? 0) > 0) {
      setSectionCategoriesResolved([])
      return
    }
    const catIds = Array.isArray(section.categoryId) ? section.categoryId : []
    if (catIds.length === 0) return
    const ids = catIds.map((id) => (id && typeof id === 'object' && id.toString) ? id.toString() : String(id))
    let cancelled = false
    Promise.all(ids.map((id) => categoriesService.getById(id).then((r) => r?.data?.data ?? r?.data).catch(() => null)))
      .then((list) => {
        if (!cancelled) setSectionCategoriesResolved(list.filter(Boolean))
      })
      .catch(() => { if (!cancelled) setSectionCategoriesResolved([]) })
    return () => { cancelled = true }
  }, [section])

  const categoriesWithId = hasPopulatedCategories
    ? section.categories.map((c) => ({
        id: c._id ?? c.id,
        label: (c.name ?? '').toUpperCase() || String(c._id ?? c.id),
      }))
    : sectionCategoriesResolved.length > 0
      ? sectionCategoriesResolved.map((c) => ({
          id: c._id ?? c.id,
          label: (c.name ?? '').toUpperCase() || String(c._id ?? c.id),
        }))
      : CATEGORIES.map((label) => ({ id: null, label }))

  const [activeCategoryId, setActiveCategoryId] = useState(categoriesWithId[0]?.id ?? null)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [loadingCategory, setLoadingCategory] = useState(false)

  const sectionTitle = section?.title || 'OUR PRODUCTS'
  const exploreTo = section?._id ? `/search?sectionId=${section._id}` : '/search'

  const listFromSection = section?.products
    ?.filter((p) => p?.item)
    ?.map((p, i) => itemToCardProps(p.item, i)) ?? []

  const fetchByCategory = useCallback(
    async (categoryId) => {
      if (!categoryId) {
        setCategoryProducts([])
        return
      }
      setLoadingCategory(true)
      try {
        const params = { categoryId, limit: CATEGORY_PRODUCT_LIMIT, page: 1 }
        if (pincode) params.pinCode = String(pincode)
        const res = await itemsService.search(params)
        const data = res?.data?.data ?? res?.data
        const items = (data?.items ?? []).map((item, i) => itemToCardProps(item, i))
        setCategoryProducts(items)
      } catch {
        setCategoryProducts([])
      } finally {
        setLoadingCategory(false)
      }
    },
    [pincode]
  )

  useEffect(() => {
    const firstId = section?.categories?.[0]?._id ?? section?.categories?.[0]?.id
    if (firstId != null) setActiveCategoryId(firstId)
  }, [section])

  useEffect(() => {
    if (listFromSection.length > 0) {
      setCategoryProducts([])
      return
    }
    if (activeCategoryId) {
      fetchByCategory(activeCategoryId)
    } else {
      setCategoryProducts([])
    }
  }, [activeCategoryId, listFromSection.length, fetchByCategory])

  const productsToShow =
    listFromSection.length > 0
      ? listFromSection
      : categoryProducts.length > 0
        ? categoryProducts
        : PRODUCTS_STATIC

  const handleTabClick = (cat) => {
    if (cat.id != null) setActiveCategoryId(cat.id)
  }

  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col lg:ml-[6vw] lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">

          {/* LEFT SIDE */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full">

            {/* TITLE */}
            <h2 className="font-raleway text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wide text-black">
              {sectionTitle}
            </h2>

            {/* CATEGORY TABS */}
            <div className="font-inter flex gap-6 mt-6 overflow-x-auto scrollbar-hide">
              {categoriesWithId.map((cat) => (
                <button
                  key={cat.id ?? cat.label}
                  type="button"
                  onClick={() => handleTabClick(cat)}
                  className={`uppercase text-xs sm:text-sm tracking-widest pb-2 border-b-2 transition-all whitespace-nowrap ${
                    activeCategoryId === cat.id
                      ? 'text-black border-black'
                      : 'text-gray-400 border-transparent hover:text-black'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* EXPLORE MORE — single line */}
          <div className="flex justify-center lg:justify-end lg:shrink-0 mr-[10vw]">
            <Link
              to={exploreTo}
              className="font-inter inline-flex items-center gap-1 uppercase text-xs sm:text-sm tracking-widest text-black border-b border-black pb-1 hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              <span>Explore More</span>
              <IoChevronForward className="shrink-0" />
            </Link>
          </div>

        </div>

        {/* ================= PRODUCT GRID (1 card on mobile) ================= */}
        {loadingCategory && (
          <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6">
          {!loadingCategory && productsToShow.map((product, idx) => (
            <ProductCard
              key={product.id ?? idx}
              {...product}
              rounded="none"
            />
          ))}
        </div>

        {/* EXPLORE MORE — below grid */}
        <div className="flex justify-center mt-10 sm:mt-12">
          <Link
            to={exploreTo}
            className="font-inter inline-flex items-center gap-1 uppercase text-xs sm:text-sm tracking-widest text-black border-b border-black pb-1 hover:opacity-70 transition-opacity"
          >
            <span>Explore More</span>
            <IoChevronForward />
          </Link>
        </div>

      </div>
    </section>
  )
}

export default OurProduct