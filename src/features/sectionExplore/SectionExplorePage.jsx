import { useState, useEffect, useCallback } from 'react'
import { debugLog, debugError } from '../../utils/debugLog.js';
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProductCard, { PRODUCT_CARD_COMPACT_GRID_PROPS } from '../../shared/components/ProductCard'
import { sectionsService } from '../../services/content.service.js'
import { itemsService } from '../../services/items.service.js'
import { categoriesService, subcategoriesService } from '../../services/categories.service.js'
import { ROUTES } from '../../utils/constants'
import { getItemStockTotal } from '../../utils/productStock.js'
import { listingBindOfferProps } from '../../utils/bindOffer.js'

const DEFAULT_LIMIT = 12

function itemToCardProps(item, section = null) {
  const id = item._id ?? item.id
  const variants = item.variants ?? []
  const firstVariant = variants[0]
  const images = firstVariant?.images ?? []
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const imageUrl = sorted[0]?.url ?? ''
  const hoverUrl = sorted[1]?.url ?? imageUrl
  const price = item.discountedPrice != null
    ? `₹${Number(item.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : item.price != null
      ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '—'
  const originalPrice = item.discountedPrice != null && item.price != null && Number(item.price) > Number(item.discountedPrice)
    ? `₹${Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : undefined
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day'
      : item.deliveryType ? String(item.deliveryType) : '—'
  const offerProps = listingBindOfferProps(item, section)
  return {
    id,
    image: imageUrl || 'https://placehold.co/400x520?text=Product',
    hoverImage: hoverUrl || undefined,
    title: item.name ?? 'Product',
    shortDescription: item.shortDescription ?? '',
    stock: getItemStockTotal(item),
    price,
    originalPrice,
    delivery,
    rating: 4,
    ...offerProps,
  }
}

/** MANUAL/FLASH with products only (no category/subcategory) → show items by sectionId */
function isItemsOnlySection(section) {
  if (!section) return false
  const type = section.type
  const hasCategories = Array.isArray(section.categoryId) && section.categoryId.length > 0
  const hasSubcategories = Array.isArray(section.subcategoryId) && section.subcategoryId.length > 0
  return (type === 'MANUAL' || type === 'FLASH') && !hasCategories && !hasSubcategories
}

/** CATEGORY with only categoryId (no subcategoryId) → "Our Product": category dropdown, filter by category */
function isOurProductSection(section) {
  if (!section || section.type !== 'CATEGORY') return false
  const hasCategories = Array.isArray(section.categoryId) && section.categoryId.length > 0
  const hasSubcategories = Array.isArray(section.subcategoryId) && section.subcategoryId.length > 0
  return hasCategories && !hasSubcategories
}

/** CATEGORY with categoryId + subcategoryId → "Our Category": category + subcategory dropdown */
function isOurCategorySection(section) {
  if (!section || section.type !== 'CATEGORY') return false
  const hasCategories = Array.isArray(section.categoryId) && section.categoryId.length > 0
  const hasSubcategories = Array.isArray(section.subcategoryId) && section.subcategoryId.length > 0
  return hasCategories && hasSubcategories
}

export function SectionExplorePage() {
  const { sectionId } = useParams()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [section, setSection] = useState(null)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  /** For Our Product: selected category id. For Our Category: { type: 'category'|'subcategory', id } */
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState(null) // { type: 'category'|'subcategory', id }

  const loadSection = useCallback(async () => {
    if (!sectionId) return
    try {
      const res = await sectionsService.getOne(sectionId)
      debugLog('[SectionExplore] section response (full):', res)
      debugLog('[SectionExplore] section response data:', res?.data)
      const data = res?.data?.data ?? res?.data
      debugLog('[SectionExplore] section parsed:', data)
      setSection(data || null)
    } catch (e) {
      debugError('[SectionExplore] section error:', e)
      setError(e?.message ?? 'Section not found')
      setSection(null)
    }
  }, [sectionId])

  /** Fetch category/subcategory details when section is CATEGORY type */
  const loadCategoriesAndSubcategories = useCallback(async (sec) => {
    if (!sec || sec.type !== 'CATEGORY') {
      debugLog('[SectionExplore] categories/subs skipped (not CATEGORY section):', sec?.type)
      setCategories([])
      setSubcategories([])
      return
    }
    const catIds = Array.isArray(sec.categoryId) ? sec.categoryId : []
    const subIds = Array.isArray(sec.subcategoryId) ? sec.subcategoryId : []
    debugLog('[SectionExplore] loading categories/subcategories:', { catIds, subIds })
    const catPromises = catIds.map((id) =>
      categoriesService.getById(id).then((r) => {
        debugLog('[SectionExplore] category response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((e) => {
        debugError('[SectionExplore] category error:', id, e)
        return null
      })
    )
    const subPromises = subIds.map((id) =>
      subcategoriesService.getById(id).then((r) => {
        debugLog('[SectionExplore] subcategory response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((e) => {
        debugError('[SectionExplore] subcategory error:', id, e)
        return null
      })
    )
    const [catResults, subResults] = await Promise.all([
      Promise.all(catPromises),
      Promise.all(subPromises),
    ])
    debugLog('[SectionExplore] categories result:', catResults)
    debugLog('[SectionExplore] subcategories result:', subResults)
    setCategories(catResults.filter(Boolean))
    setSubcategories(subResults.filter(Boolean))
  }, [])

  const loadProducts = useCallback(async () => {
    if (!sectionId) return
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: DEFAULT_LIMIT }
      if (pincode) params.pinCode = String(pincode)

      if (isItemsOnlySection(section)) {
        params.sectionId = sectionId
      } else if (isOurProductSection(section)) {
        const catId = selectedCategoryId ?? section.categoryId?.[0]
        if (!catId) {
          setProducts([])
          setPagination(null)
          setLoading(false)
          return
        }
        params.categoryId = catId
      } else if (isOurCategorySection(section)) {
        const filter = selectedFilter
        if (!filter?.id) {
          const firstCat = section.categoryId?.[0]
          const firstSub = section.subcategoryId?.[0]
          if (firstSub) {
            params.subcategoryId = firstSub
          } else if (firstCat) {
            params.categoryId = firstCat
          } else {
            setProducts([])
            setPagination(null)
            setLoading(false)
            return
          }
        } else if (filter.type === 'subcategory') {
          params.subcategoryId = filter.id
        } else {
          params.categoryId = filter.id
        }
      } else {
        setProducts([])
        setPagination(null)
        setLoading(false)
        return
      }

      debugLog('[SectionExplore] products search params:', params)
      const res = await itemsService.search(params)
      debugLog('[SectionExplore] products response (full):', res)
      debugLog('[SectionExplore] products response data:', res?.data)
      const data = res?.data?.data ?? res?.data
      const rawItems = data?.items ?? []
      debugLog('[SectionExplore] products raw items:', rawItems)
      debugLog('[SectionExplore] products pagination:', data?.pagination)
      const items = rawItems.map((item) => itemToCardProps(item, section))
      setProducts(items)
      setPagination(data?.pagination ?? null)
    } catch (e) {
      debugError('[SectionExplore] products error:', e)
      setError(e?.message ?? 'Failed to load products')
      setProducts([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [
    sectionId,
    section,
    page,
    pincode,
    selectedCategoryId,
    selectedFilter,
  ])

  useEffect(() => {
    loadSection()
  }, [loadSection])

  useEffect(() => {
    if (!section) return
    if (section.type === 'CATEGORY') {
      loadCategoriesAndSubcategories(section)
    } else {
      setCategories([])
      setSubcategories([])
    }
  }, [section, loadCategoriesAndSubcategories])

  useEffect(() => {
    if (!sectionId || !section) return
    if (isOurProductSection(section) && categories.length && selectedCategoryId === null) {
      setSelectedCategoryId(section.categoryId[0])
    }
    if (isOurCategorySection(section) && (categories.length || subcategories.length) && selectedFilter === null) {
      const firstSub = section.subcategoryId?.[0]
      const firstCat = section.categoryId?.[0]
      if (firstSub) setSelectedFilter({ type: 'subcategory', id: firstSub })
      else if (firstCat) setSelectedFilter({ type: 'category', id: firstCat })
    }
  }, [sectionId, section, categories.length, subcategories.length, selectedCategoryId, selectedFilter])

  useEffect(() => {
    if (!sectionId) {
      setProducts([])
      setPagination(null)
      setLoading(false)
      return
    }
    if (!section) return
    loadProducts()
  }, [sectionId, section, page, selectedCategoryId, selectedFilter, loadProducts])

  if (!sectionId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Missing section.</p>
        <Link to={ROUTES.HOME} className="text-black underline mt-4 inline-block">Back to home</Link>
      </div>
    )
  }

  if (sectionId && !section && !error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-500">
        Loading section…
      </div>
    )
  }

  if (error && !section) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error}</p>
        <Link to={ROUTES.HOME} className="text-black underline mt-4 inline-block">Back to home</Link>
      </div>
    )
  }

  const totalPages = pagination?.totalPages ?? 0
  const hasMore = page < totalPages
  const sectionTitle = section?.title ?? 'Section'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to={ROUTES.HOME} className="text-sm text-black underline">← Back to home</Link>
        <h1 className="mt-4 font-raleway text-2xl font-extrabold tracking-wide text-black sm:text-4xl">
          {sectionTitle}
        </h1>
      </div>

      {loading && products.length === 0 && (
        <div className="py-12 text-center text-gray-500">Loading...</div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-2.5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((item, idx) => (
              <div key={item.id ?? idx} className="min-w-0">
                <ProductCard {...item} {...PRODUCT_CARD_COMPACT_GRID_PROPS} />
              </div>
            ))}
          </div>
          {pagination && totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="border border-black px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="py-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="border border-black px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!loading && section && products.length === 0 && !error && (
        <p className="py-12 text-center text-gray-500">No products in this section.</p>
      )}
    </div>
  )
}

export default SectionExplorePage
