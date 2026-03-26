import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProductCard from '../../shared/components/ProductCard'
import { sectionsService } from '../../services/content.service.js'
import { itemsService } from '../../services/items.service.js'
import { categoriesService, subcategoriesService } from '../../services/categories.service.js'
import { ROUTES, getSearchPath } from '../../utils/constants'

const DEFAULT_LIMIT = 12

function itemToCardProps(item) {
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
  return {
    id,
    image: imageUrl || 'https://placehold.co/400x520?text=Product',
    hoverImage: hoverUrl || undefined,
    title: item.name ?? 'Product',
    shortDescription: item.shortDescription ?? '',
    price,
    originalPrice,
    delivery,
    rating: 4,
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
      console.log('[SectionExplore] section response (full):', res)
      console.log('[SectionExplore] section response data:', res?.data)
      const data = res?.data?.data ?? res?.data
      console.log('[SectionExplore] section parsed:', data)
      setSection(data || null)
    } catch (e) {
      console.error('[SectionExplore] section error:', e)
      setError(e?.message ?? 'Section not found')
      setSection(null)
    }
  }, [sectionId])

  /** Fetch category/subcategory details when section is CATEGORY type */
  const loadCategoriesAndSubcategories = useCallback(async (sec) => {
    if (!sec || sec.type !== 'CATEGORY') {
      console.log('[SectionExplore] categories/subs skipped (not CATEGORY section):', sec?.type)
      setCategories([])
      setSubcategories([])
      return
    }
    const catIds = Array.isArray(sec.categoryId) ? sec.categoryId : []
    const subIds = Array.isArray(sec.subcategoryId) ? sec.subcategoryId : []
    console.log('[SectionExplore] loading categories/subcategories:', { catIds, subIds })
    const catPromises = catIds.map((id) =>
      categoriesService.getById(id).then((r) => {
        console.log('[SectionExplore] category response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((e) => {
        console.error('[SectionExplore] category error:', id, e)
        return null
      })
    )
    const subPromises = subIds.map((id) =>
      subcategoriesService.getById(id).then((r) => {
        console.log('[SectionExplore] subcategory response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((e) => {
        console.error('[SectionExplore] subcategory error:', id, e)
        return null
      })
    )
    const [catResults, subResults] = await Promise.all([
      Promise.all(catPromises),
      Promise.all(subPromises),
    ])
    console.log('[SectionExplore] categories result:', catResults)
    console.log('[SectionExplore] subcategories result:', subResults)
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

      console.log('[SectionExplore] products search params:', params)
      const res = await itemsService.search(params)
      console.log('[SectionExplore] products response (full):', res)
      console.log('[SectionExplore] products response data:', res?.data)
      const data = res?.data?.data ?? res?.data
      const rawItems = data?.items ?? []
      console.log('[SectionExplore] products raw items:', rawItems)
      console.log('[SectionExplore] products pagination:', data?.pagination)
      const items = rawItems.map(itemToCardProps)
      setProducts(items)
      setPagination(data?.pagination ?? null)
    } catch (e) {
      console.error('[SectionExplore] products error:', e)
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
  const isCategorySection = section?.type === 'CATEGORY'
  const exploreSearchUrl = isCategorySection && section?.categoryId?.[0]
    ? getSearchPath({
        categoryId: section.categoryId[0],
        categoryName: categories.find(
          (c) => String(c._id ?? c.id) === String(section.categoryId[0]),
        )?.name,
      })
    : ROUTES.SEARCH

  const showOurProductDropdown = isOurProductSection(section) && categories.length > 0
  const showOurCategoryDropdown = isOurCategorySection(section) && (categories.length > 0 || subcategories.length > 0)

  const handleOurProductChange = (e) => {
    const id = e.target.value || null
    setSelectedCategoryId(id)
    setPage(1)
  }

  const handleOurCategoryChange = (e) => {
    const val = e.target.value
    if (!val) {
      setSelectedFilter(null)
      setPage(1)
      return
    }
    const [type, id] = val.split('::')
    setSelectedFilter(type && id ? { type, id } : null)
    setPage(1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to={ROUTES.HOME} className="text-black underline text-sm">← Back to home</Link>
        <h1 className="font-raleway text-2xl sm:text-4xl font-extrabold tracking-wide text-black mt-4">
          {sectionTitle}
        </h1>
        {isCategorySection && (
          <Link
            to={exploreSearchUrl}
            className="inline-flex items-center gap-1 uppercase text-xs sm:text-sm tracking-widest text-black border-b border-black pb-1 mt-2 hover:opacity-70 transition-opacity"
          >
            <span>Explore more in search</span>
          </Link>
        )}
      </div>

      {/* Our Product: only section's categories in dropdown */}
      {showOurProductDropdown && (
        <div className="mb-6">
          <label htmlFor="section-category-select" className="font-inter text-sm font-medium text-gray-700 mr-2">
            Category
          </label>
          <select
            id="section-category-select"
            value={selectedCategoryId ?? section.categoryId?.[0] ?? ''}
            onChange={handleOurProductChange}
            className="font-inter border border-black px-4 py-2 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name ?? cat._id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Our Category: categories + subcategories in one dropdown (only section's) */}
      {showOurCategoryDropdown && (
        <div className="mb-6">
          <label htmlFor="section-filter-select" className="font-inter text-sm font-medium text-gray-700 mr-2">
            Category / Subcategory
          </label>
          <select
            id="section-filter-select"
            value={
              selectedFilter
                ? `${selectedFilter.type}::${selectedFilter.id}`
                : section?.subcategoryId?.[0]
                  ? `subcategory::${section.subcategoryId[0]}`
                  : section?.categoryId?.[0]
                    ? `category::${section.categoryId[0]}`
                    : ''
            }
            onChange={handleOurCategoryChange}
            className="font-inter border border-black px-4 py-2 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <option value="">Select…</option>
            {categories.length > 0 && (
              <optgroup label="Categories">
                {categories.map((cat) => (
                  <option key={`cat-${cat._id}`} value={`category::${cat._id}`}>
                    {cat.name ?? cat._id}
                  </option>
                ))}
              </optgroup>
            )}
            {subcategories.length > 0 && (
              <optgroup label="Subcategories">
                {subcategories.map((sub) => (
                  <option key={`sub-${sub._id}`} value={`subcategory::${sub._id}`}>
                    {sub.name ?? sub._id}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {loading && products.length === 0 && (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((item, idx) => (
              <ProductCard key={item.id ?? idx} {...item} rounded="none" />
            ))}
          </div>
          {pagination && totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-10">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 border border-black disabled:opacity-40"
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
                className="px-4 py-2 border border-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!loading && section && products.length === 0 && !error && (
        <p className="text-center py-12 text-gray-500">No products in this section.</p>
      )}
    </div>
  )
}

export default SectionExplorePage
