import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ACCESS_TOKEN_KEY } from '../../services/axiosClient.js'
import { addRecentKeyword } from '../../app/store/slices/searchSlice.js'
import collectionBanner from '../../assets/temporary/collection.png'
import { ROUTES, getProductPath } from '../../utils/constants'
import ProductCard from '../../shared/components/ProductCard'
import { itemsService } from '../../services/items.service.js'
import { categoriesService } from '../../services/categories.service.js'
import { filtersService } from '../../services/filters.service.js'

const DEFAULT_LIMIT = 12

/** Parse filters from URL (JSON string). Returns {} if invalid. */
function parseFiltersFromUrl(str) {
  if (!str || typeof str !== 'string') return {}
  try {
    const o = JSON.parse(str)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

/** Map backend item to ProductCard props */
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
    : '—'
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min delivery'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day delivery'
      : item.deliveryType
        ? String(item.deliveryType)
        : '—'
  return {
    id,
    image: imageUrl || 'https://placehold.co/400x520?text=Product',
    hoverImage: hoverUrl || undefined,
    title: item.name ?? 'Product',
    price,
    delivery,
    rating: 4,
  }
}

function SearchPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null

  const categoryFromUrl = searchParams.get('categoryId') || searchParams.get('category') || ''
  const subcategoryFromUrl = searchParams.get('subcategoryId') || searchParams.get('subcategory') || ''
  const qFromUrl = searchParams.get('q') || ''
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const filtersParam = searchParams.get('filters') || ''
  const filtersFromUrl = parseFiltersFromUrl(filtersParam)

  const [filterOpen, setFilterOpen] = useState(false)
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false)
  const [category, setCategory] = useState(categoryFromUrl)
  const [subcategory, setSubcategory] = useState(subcategoryFromUrl)
  const [query, setQuery] = useState(qFromUrl)
  const [categories, setCategories] = useState([])
  const [filterList, setFilterList] = useState([])
  const [selectedFilters, setSelectedFilters] = useState(filtersFromUrl)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastAppendedCount, setLastAppendedCount] = useState(0)
  const searchKeyRef = useRef('')
  const loadedPagesRef = useRef(new Set())
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [filtersLoading, setFiltersLoading] = useState(false)

  const isFromCollection = Boolean(categoryFromUrl || subcategoryFromUrl)

  useEffect(() => {
    setCategory(categoryFromUrl)
  }, [categoryFromUrl])

  useEffect(() => {
    setSubcategory(subcategoryFromUrl)
  }, [subcategoryFromUrl])

  useEffect(() => {
    setQuery(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    setSelectedFilters(parseFiltersFromUrl(filtersParam))
  }, [filtersParam])

  // Guest: add search query to Redux recent when landing with q (so header modal shows it)
  useEffect(() => {
    if (!qFromUrl.trim()) return
    const isGuest = typeof window !== 'undefined' && !localStorage.getItem(ACCESS_TOKEN_KEY)
    if (isGuest) dispatch(addRecentKeyword(qFromUrl.trim()))
  }, [qFromUrl, dispatch])

  // Load filters when filter panel opens (get filters API; include chosen pincode)
  useEffect(() => {
    if (!filtersPanelOpen) return
    setFiltersLoading(true)
    const params = {}
    if (pincode) params.pinCode = String(pincode)
    filtersService
      .getAll(params)
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const list = data?.filters ?? []
        setFilterList(Array.isArray(list) ? list : [])
      })
      .catch(() => setFilterList([]))
      .finally(() => setFiltersLoading(false))
  }, [filtersPanelOpen, pincode])

  // Load navbar categories for filter dropdown
  useEffect(() => {
    let cancelled = false
    categoriesService.getNavbar()
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const list = data?.categories ?? []
        if (!cancelled) setCategories(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (!cancelled) setCategories([]) })
      .finally(() => { if (!cancelled) setCategoriesLoading(false) })
    return () => { cancelled = true }
  }, [])

  const buildSearchKey = useCallback(
    () => [qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode].join('|'),
    [qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode]
  )

  // Search API: page 1 = replace; page > 1 = append (no full reload). Track loaded pages to avoid duplicate append.
  const runSearch = useCallback(async () => {
    const key = buildSearchKey()
    const isNewSearch = key !== searchKeyRef.current
    const isPageOne = pageFromUrl <= 1
    const alreadyLoaded = loadedPagesRef.current.has(pageFromUrl)

    if (isNewSearch) {
      searchKeyRef.current = key
      loadedPagesRef.current = new Set()
    }

    if (alreadyLoaded && !isNewSearch) return

    if (isPageOne || isNewSearch) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = {
        page: pageFromUrl,
        limit: DEFAULT_LIMIT,
      }
      if (qFromUrl.trim()) params.keyword = qFromUrl.trim()
      if (categoryFromUrl) params.categoryId = categoryFromUrl
      if (subcategoryFromUrl) params.subcategoryId = subcategoryFromUrl
      if (pincode) params.pinCode = String(pincode)
      const parsed = parseFiltersFromUrl(filtersParam)
      const filtersObj = Object.keys(parsed).length ? parsed : undefined
      if (filtersObj) params.filters = filtersObj

      const res = await itemsService.search(params)
      const data = res?.data?.data ?? res?.data
      const items = (data?.items ?? []).map(itemToCardProps)
      const pag = data?.pagination ?? null

      if (isPageOne || isNewSearch) {
        loadedPagesRef.current = new Set([1])
        setProducts(items)
        setLastAppendedCount(0)
      } else {
        loadedPagesRef.current.add(pageFromUrl)
        setProducts((prev) => [...prev, ...items])
        setLastAppendedCount(items.length)
        setTimeout(() => setLastAppendedCount(0), 600)
      }
      setPagination(pag)
    } catch {
      if (isPageOne || isNewSearch) setProducts([])
      setPagination(null)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [qFromUrl, categoryFromUrl, subcategoryFromUrl, pageFromUrl, filtersParam, pincode, buildSearchKey])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const handleSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (query.trim()) next.set('q', query.trim())
    else next.delete('q')
    if (category) next.set('category', category)
    else next.delete('category')
    next.delete('subcategory')
    next.delete('page')
    setSearchParams(next)
  }

  const handleCategorySelect = (catId) => {
    setCategory(catId)
    setFilterOpen(false)
    const next = new URLSearchParams(searchParams)
    if (catId) next.set('category', catId)
    else next.delete('category')
    next.delete('subcategory')
    next.set('page', '1')
    setSearchParams(next)
  }

  const toggleFilterValue = (filterKey, value) => {
    const key = (filterKey || '').toLowerCase().trim()
    const val = (value || '').toLowerCase().trim()
    if (!key || !val) return
    setSelectedFilters((prev) => {
      const arr = prev[key] ? (Array.isArray(prev[key]) ? [...prev[key]] : [prev[key]]) : []
      const idx = arr.indexOf(val)
      if (idx >= 0) {
        arr.splice(idx, 1)
        if (arr.length === 0) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: arr }
      }
      return { ...prev, [key]: [...arr, val] }
    })
  }

  const isFilterValueSelected = (filterKey, value) => {
    const key = (filterKey || '').toLowerCase().trim()
    const val = (value || '').toLowerCase().trim()
    const arr = selectedFilters[key]
    return Array.isArray(arr) && arr.includes(val)
  }

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams)
    if (Object.keys(selectedFilters).length) {
      next.set('filters', JSON.stringify(selectedFilters))
    } else {
      next.delete('filters')
    }
    next.set('page', '1')
    setSearchParams(next)
    setFiltersPanelOpen(false)
  }

  const clearFilters = () => {
    setSelectedFilters({})
    const next = new URLSearchParams(searchParams)
    next.delete('filters')
    next.set('page', '1')
    setSearchParams(next)
    setFiltersPanelOpen(false)
  }

  const bannerImage = collectionBanner
  const categoryLabel = categories.find((c) => (c._id ?? c.id) === category)?.name ?? (category ? 'Collection' : '')
  const bannerTitle = isFromCollection && categoryLabel
    ? categoryLabel
    : 'Search'

  const breadcrumb = (
    <div className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center gap-3 font-inter text-sm" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 hover:text-black transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Link to={ROUTES.HOME} className="text-gray-500 hover:text-black transition-colors">Home</Link>
          <span className="text-gray-400" aria-hidden>/</span>
          <Link to={ROUTES.SEARCH} className="text-gray-900 font-medium">Search</Link>
        </nav>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="relative w-full h-screen overflow-hidden">
        <img
          src={bannerImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="font-raleway text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-wide">
            {bannerTitle}
          </h1>
        </div>
      </div>

      {breadcrumb}

      {/* Toolbar: Filter button + Search bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Filter button (dropdown) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className="font-inter flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{categoryLabel || 'All categories'}</span>
                <svg className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden />
                  <div className="absolute left-0 top-full mt-1 z-20 w-48 max-h-64 overflow-y-auto py-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('')}
                      className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                        !category ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'
                      }`}
                    >
                      All categories
                    </button>
                    {categoriesLoading ? (
                      <div className="font-inter px-4 py-2 text-sm text-gray-500">Loading…</div>
                    ) : (
                      categories.map((c) => {
                        const cid = c._id ?? c.id
                        return (
                          <button
                            key={cid}
                            type="button"
                            onClick={() => handleCategorySelect(cid)}
                            className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                              category === cid ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'
                            }`}
                          >
                            {c.name ?? cid}
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Filters button (attributes: color, size, etc.) */}
            <button
              type="button"
              onClick={() => setFiltersPanelOpen(true)}
              className="font-inter flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {Object.keys(selectedFilters).some((k) => (selectedFilters[k]?.length ?? 0) > 0) && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1.5 text-xs font-medium text-white">
                  {Object.values(selectedFilters).flat().length}
                </span>
              )}
            </button>

            {/* Search bar */}
            <div className="flex-1 flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFromCollection ? `Search in ${bannerTitle}...` : 'Find your choice'}
                className="font-inter flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
              />
              <button
                type="submit"
                className="font-inter shrink-0 px-4 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filters panel (get filters API) */}
      {filtersPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setFiltersPanelOpen(false)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-sm bg-white shadow-xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Filter by attributes"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-inter text-lg font-semibold text-black">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersPanelOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filtersLoading ? (
                <p className="font-inter text-sm text-gray-500">Loading filters…</p>
              ) : filterList.length === 0 ? (
                <p className="font-inter text-sm text-gray-500">No filters available.</p>
              ) : (
                <ul className="space-y-6">
                  {filterList.map((f) => {
                    const key = f.key ?? ''
                    const label = f.label ?? key
                    const values = f.values ?? []
                    return (
                      <li key={key}>
                        <p className="font-inter text-sm font-medium text-black mb-2">{label}</p>
                        <ul className="flex flex-wrap gap-2">
                          {values.map((v) => {
                            const val = v.value ?? ''
                            const displayLabel = v.label ?? val
                            const checked = isFilterValueSelected(key, val)
                            return (
                              <li key={val}>
                                <label className="font-inter flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleFilterValue(key, val)}
                                    className="rounded border-gray-300 text-black focus:ring-black/20"
                                  />
                                  <span className="text-sm text-gray-700">{displayLabel}</span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="font-inter flex-1 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="font-inter flex-1 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* Results from search API with filters */}
      <div className="container mx-auto px-4 py-8">
        {(qFromUrl || categoryFromUrl || subcategoryFromUrl) && (
          <p className="font-inter text-gray-600 mb-6">
            {qFromUrl && categoryFromUrl && `Results for "${qFromUrl}" in ${categoryLabel || 'category'}`}
            {qFromUrl && !categoryFromUrl && `Results for "${qFromUrl}"`}
            {!qFromUrl && (categoryFromUrl || subcategoryFromUrl) && `Browsing ${categoryLabel || 'collection'}`}
          </p>
        )}
        {loading ? (
          <div className="font-inter text-gray-500 py-12 text-center">Loading results…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product, index) => {
                const isNew = lastAppendedCount > 0 && index >= products.length - lastAppendedCount
                return (
                  <Link
                    key={`${product.id}-${index}`}
                    to={getProductPath(product.id)}
                    className={`block transition-all duration-500 ease-out ${
                      isNew ? 'animate-search-card-in' : ''
                    }`}
                    style={isNew ? { animationFillMode: 'backwards' } : undefined}
                  >
                    <ProductCard {...product} rounded="none" />
                  </Link>
                )
              })}
            </div>
            {loadingMore && (
              <div className="font-inter text-sm text-gray-500 py-4 text-center">Loading more…</div>
            )}
            {!loading && products.length === 0 && (
              <p className="font-inter text-gray-500 py-12 text-center">
                No products found. Try a different search or category.
              </p>
            )}
            {pagination && pagination.totalPages > 1 && (() => {
              let start = Math.max(1, pagination.page - 2)
              const total = pagination.totalPages
              let end = Math.min(total, start + 4)
              if (end - start + 1 < 5) start = Math.max(1, end - 4)
              const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i)
              return (
              <div className="font-inter flex items-center justify-center gap-1.5 mt-8">
                {pageNumbers.map((pageNum) => {
                  const isActive = pagination.page === pageNum
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.set('page', String(pageNum))
                        setSearchParams(next)
                      }}
                      className={`min-w-9 px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams)
                    next.set('page', String(pagination.page + 1))
                    setSearchParams(next)
                  }}
                  className="min-w-9 p-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}

export default SearchPage
