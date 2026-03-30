import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { IoChevronForwardOutline } from 'react-icons/io5'
import { useSearchParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ACCESS_TOKEN_KEY } from '../../services/axiosClient.js'
import { addRecentKeyword } from '../../app/store/slices/searchSlice.js'
import collectionBanner from '../../assets/temporary/websitebanner.svg'
import { ROUTES, getProductPath } from '../../utils/constants'
import ProductCard from '../../shared/components/ProductCard'
import { itemsService } from '../../services/items.service.js'
import { categoriesService, subcategoriesService } from '../../services/categories.service.js'
import { sectionsService } from '../../services/content.service.js'
import { filtersService } from '../../services/filters.service.js'
import Filter from "../../assets/temporary/filtericon.svg"
const DEFAULT_LIMIT = 12

/** Same chevron for category dropdowns and styled selects (outline, matches breadcrumb weight). */
function DropdownChevron({ open, className = '' }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-current transition-transform duration-200 ease-out md:h-4 md:w-4 ${open ? 'rotate-180' : ''} ${className}`.trim()}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function totalPagesFromPagination(pag) {
  if (!pag) return 1
  if (pag.totalPages != null && pag.totalPages !== '') {
    return Math.max(1, Number(pag.totalPages))
  }
  if (pag.total != null && pag.limit) {
    return Math.max(1, Math.ceil(Number(pag.total) / Number(pag.limit)))
  }
  return 1
}

/** Section has only categoryId (no subcategoryId) → Our Product: category dropdown only */
function isSectionOurProduct(section) {
  if (!section || section.type !== 'CATEGORY') return false
  const hasCat = Array.isArray(section.categoryId) && section.categoryId.length > 0
  const hasSub = Array.isArray(section.subcategoryId) && section.subcategoryId.length > 0
  return hasCat && !hasSub
}

/** Section has categoryId + subcategoryId → Our Category: category + subcategory dropdown */
function isSectionOurCategory(section) {
  if (!section || section.type !== 'CATEGORY') return false
  const hasCat = Array.isArray(section.categoryId) && section.categoryId.length > 0
  const hasSub = Array.isArray(section.subcategoryId) && section.subcategoryId.length > 0
  return hasCat && hasSub
}

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

/** Filter value like "500-1500" → { min, max } for price quick picks */
function parsePriceRangeBucketValue(raw) {
  const s = String(raw ?? '').trim()
  const m = s.match(/^(\d+)-(\d+)$/)
  if (!m) return null
  return { min: Number(m[1]), max: Number(m[2]) }
}

/** True if item has at least one variant/size with available stock */
function hasAnyStock(item) {
  if (item.inStock === true) return true
  if (item.inStock === false) return false
  const variants = item.variants ?? []
  for (const v of variants) {
    const sizes = v.sizes ?? []
    for (const s of sizes) {
      const qty = Number(s.availableQuantity ?? s.stock ?? 0)
      if (s.inStock === true || (s.inStock !== false && qty > 0)) return true
    }
  }
  return false
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
      : item.deliveryType
        ? String(item.deliveryType)
        : '—'
  const rawRating = item.rating ?? item.averageRating
  const rating = rawRating != null && rawRating !== '' && Number(rawRating) > 0 ? Number(rawRating) : undefined
  const outOfStock = item.inStock === false || !hasAnyStock(item)
  return {
    id,
    image: imageUrl || 'https://placehold.co/400x520?text=Product',
    hoverImage: hoverUrl || undefined,
    title: item.name ?? 'Product',
    shortDescription: item.shortDescription ?? '',
    price,
    originalPrice,
    delivery,
    ...(rating != null ? { rating } : {}),
    outOfStock,
  }
}

function SearchPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null

  const sectionIdFromUrl = searchParams.get('sectionId') || ''
  const collectionFromUrl = searchParams.get('collection') || ''
  const itemsOnlyFromUrl = searchParams.get('itemsOnly') || ''
  const categoryFromUrl = searchParams.get('categoryId') || searchParams.get('category') || ''
  const subcategoryFromUrl = searchParams.get('subcategoryId') || searchParams.get('subcategory') || ''
  const qFromUrl = searchParams.get('q') || ''
  const filtersParam = searchParams.get('filters') || ''
  const filtersFromUrl = parseFiltersFromUrl(filtersParam)

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false)
  const categoryTriggerRef = useRef(null)
  const [categoryDropdownRect, setCategoryDropdownRect] = useState(null)
  const [category, setCategory] = useState(categoryFromUrl)
  const [subcategory, setSubcategory] = useState(subcategoryFromUrl)
  const [query, setQuery] = useState(qFromUrl)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [section, setSection] = useState(null)
  const [sectionCategories, setSectionCategories] = useState([])
  const [sectionSubcategories, setSectionSubcategories] = useState([])
  const [filterList, setFilterList] = useState([])
  const [selectedFilters, setSelectedFilters] = useState(filtersFromUrl)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [listPage, setListPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastAppendedCount, setLastAppendedCount] = useState(0)
  const searchKeyRef = useRef('')
  const loadedPagesRef = useRef(new Set())
  const inFlightPagesRef = useRef(new Set())
  const loadMoreSentinelRef = useRef(null)
  const paginationRef = useRef(null)
  paginationRef.current = pagination
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 })
  const [priceSliderActiveThumb, setPriceSliderActiveThumb] = useState('min')
  const priceSliderRef = useRef(null)
  const [expandedFilterKeys, setExpandedFilterKeys] = useState(() => new Set())
  const [dropdownAnimateOpen, setDropdownAnimateOpen] = useState(false)
  // Keep initial image loading light; lazy-load most product thumbnails.
  const [eagerCardsCount, setEagerCardsCount] = useState(4)

  const toggleFilterExpanded = (filterKey) => {
    setExpandedFilterKeys((prev) => {
      const next = new Set(prev)
      if (next.has(filterKey)) next.delete(filterKey)
      else next.add(filterKey)
      return next
    })
  }

  const isFromCollection = Boolean(categoryFromUrl || subcategoryFromUrl)
  const isSectionScoped = Boolean(sectionIdFromUrl)
  const isItemsOnlyView = Boolean(itemsOnlyFromUrl)
  const showOurProductDropdown = !isItemsOnlyView && isSectionScoped && section && isSectionOurProduct(section) && sectionCategories.length > 0
  const showOurCategoryDropdown = !isItemsOnlyView && isSectionScoped && section && isSectionOurCategory(section) && (sectionCategories.length > 0 || sectionSubcategories.length > 0)
  const showGlobalCategoryDropdown = !isSectionScoped && !isItemsOnlyView

  // DEBUG: section-scoped dropdown visibility
  console.log('[SearchPage] section-scoped debug', {
    sectionIdFromUrl,
    isSectionScoped,
    section: section ? { _id: section._id, type: section.type, categoryId: section.categoryId, subcategoryId: section.subcategoryId } : null,
    isSectionOurProduct: section ? isSectionOurProduct(section) : false,
    isSectionOurCategory: section ? isSectionOurCategory(section) : false,
    sectionCategoriesLength: sectionCategories.length,
    sectionSubcategoriesLength: sectionSubcategories.length,
    showOurProductDropdown,
    showOurCategoryDropdown,
    showGlobalCategoryDropdown,
  })

  useEffect(() => {
    if (filterOpen && categoryTriggerRef.current) {
      setCategoryDropdownRect(categoryTriggerRef.current.getBoundingClientRect())
    } else {
      setCategoryDropdownRect(null)
      setDropdownAnimateOpen(false)
    }
  }, [filterOpen])

  // Estimate "above the fold" cards based on viewport width.
  // This prevents loading `DEFAULT_LIMIT` thumbnails eagerly on mobile.
  useEffect(() => {
    const calc = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024
      const cols = w >= 1024 ? 4 : w >= 640 ? 2 : 1
      const rows = 2
      const count = cols * rows
      setEagerCardsCount(Math.max(2, Math.min(DEFAULT_LIMIT, count)))
    }
    calc()
    if (typeof window === 'undefined') return
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  useEffect(() => {
    if (!filterOpen || !categoryDropdownRect) return
    const id = requestAnimationFrame(() => setDropdownAnimateOpen(true))
    return () => cancelAnimationFrame(id)
  }, [filterOpen, categoryDropdownRect])

  useEffect(() => {
    setCategory(categoryFromUrl)
  }, [categoryFromUrl])

  useEffect(() => {
    setSubcategory(subcategoryFromUrl)
  }, [subcategoryFromUrl])

  // Our Product / Our Category: when section has categories and URL has no category, set first category so items show
  useEffect(() => {
    if (!sectionIdFromUrl || !section || itemsOnlyFromUrl) return
    if (sectionCategories.length === 0) return
    if (categoryFromUrl || subcategoryFromUrl) return
    const firstCat = sectionCategories[0]
    const firstCatId = firstCat?._id ?? firstCat?.id
    if (!firstCatId) return
    const next = new URLSearchParams(searchParams)
    next.set('sectionId', sectionIdFromUrl)
    next.set('categoryId', String(firstCatId))
    next.delete('page')
    setSearchParams(next)
  }, [sectionIdFromUrl, section?.type, section?.categoryId, section?.subcategoryId, sectionCategories.length, itemsOnlyFromUrl, categoryFromUrl, subcategoryFromUrl])

  useEffect(() => {
    setQuery(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    const parsed = parseFiltersFromUrl(filtersParam)
    setSelectedFilters(parsed)

    // Keep slider state in sync with URL filters
    const pr = parsed?.price_range ?? parsed?.priceRange
    const defaultMin = 0
    const defaultMax = 50000

    if (Array.isArray(pr) && pr.length >= 2) {
      const min = Number(pr[0])
      const max = Number(pr[1])
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        setPriceRange({ min, max })
        return
      }
    }

    if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
      const min = Number(pr.min ?? pr.priceMin ?? pr.low)
      const max = Number(pr.max ?? pr.priceMax ?? pr.high)
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        setPriceRange({ min, max })
        return
      }
    }

    setPriceRange({ min: defaultMin, max: defaultMax })
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
        console.log('[SearchPage] filters response (full):', res)
        console.log('[SearchPage] filters response data:', res?.data)
        const data = res?.data?.data ?? res?.data
        const list = data?.filters ?? []
        console.log('[SearchPage] filters parsed', { data, list })
        setFilterList(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.error('[SearchPage] filters error:', err)
        setFilterList([])
      })
      .finally(() => setFiltersLoading(false))
  }, [filtersPanelOpen, pincode])

  // When sectionId in URL: fetch section and section's categories/subcategories only
  useEffect(() => {
    if (!sectionIdFromUrl) {
      setSection(null)
      setSectionCategories([])
      setSectionSubcategories([])
      return
    }
    let cancelled = false
    console.log('[SearchPage] fetching section', sectionIdFromUrl)
    sectionsService.getOne(sectionIdFromUrl)
      .then((res) => {
        console.log('[SearchPage] section response (full):', res)
        console.log('[SearchPage] section response data:', res?.data)
        const data = res?.data?.data ?? res?.data
        console.log('[SearchPage] section fetch result', { raw: res?.data, data, type: data?.type, categoryId: data?.categoryId, subcategoryId: data?.subcategoryId })
        if (cancelled) return
        setSection(data || null)
      })
      .catch((err) => {
        console.error('[SearchPage] section fetch error:', err)
        if (!cancelled) setSection(null)
      })
    return () => { cancelled = true }
  }, [sectionIdFromUrl])

  useEffect(() => {
    if (!section || section.type !== 'CATEGORY') {
      console.log('[SearchPage] section categories skip', { hasSection: !!section, type: section?.type })
      setSectionCategories([])
      setSectionSubcategories([])
      return
    }
    const catIds = Array.isArray(section.categoryId) ? section.categoryId.map((id) => (id && typeof id === 'object' && id.toString) ? id.toString() : String(id)) : []
    const subIds = Array.isArray(section.subcategoryId) ? section.subcategoryId.map((id) => (id && typeof id === 'object' && id.toString) ? id.toString() : String(id)) : []
    console.log('[SearchPage] loading section categories/subcategories', { catIds, subIds })
    const catPromises = catIds.map((id) =>
      categoriesService.getById(id).then((r) => {
        console.log('[SearchPage] category getById response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((err) => { console.error('[SearchPage] category getById error', id, err); return null })
    )
    const subPromises = subIds.map((id) =>
      subcategoriesService.getById(id).then((r) => {
        console.log('[SearchPage] subcategory getById response:', id, r?.data)
        return r?.data?.data ?? r?.data
      }).catch((err) => { console.error('[SearchPage] subcategory getById error', id, err); return null })
    )
    let cancelled = false
    Promise.all([Promise.all(catPromises), Promise.all(subPromises)])
      .then(([catResults, subResults]) => {
        console.log('[SearchPage] section categories/subcategories loaded', { catResults, subResults, catLen: catResults?.length, subLen: subResults?.length })
        if (!cancelled) {
          setSectionCategories(catResults.filter(Boolean))
          setSectionSubcategories(subResults.filter(Boolean))
        }
      })
      .catch((err) => {
        console.error('[SearchPage] section categories load error', err)
        if (!cancelled) { setSectionCategories([]); setSectionSubcategories([]) }
      })
    return () => { cancelled = true }
  }, [section])

  // When no sectionId: load navbar categories for filter dropdown
  useEffect(() => {
    if (sectionIdFromUrl) {
      setCategories([])
      setCategoriesLoading(false)
      return
    }
    let cancelled = false
    categoriesService.getNavbar()
      .then((res) => {
        console.log('[SearchPage] navbar categories response (full):', res)
        console.log('[SearchPage] navbar categories response data:', res?.data)
        const data = res?.data?.data ?? res?.data
        const list = data?.categories ?? []
        console.log('[SearchPage] navbar categories parsed', { data, list })
        if (!cancelled) setCategories(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.error('[SearchPage] navbar categories error:', err)
        if (!cancelled) setCategories([])
      })
      .finally(() => { if (!cancelled) setCategoriesLoading(false) })
    return () => { cancelled = true }
  }, [sectionIdFromUrl])

  // When no sectionId and category selected: load subcategories for that category
  useEffect(() => {
    if (sectionIdFromUrl || !categoryFromUrl) {
      setSubcategories([])
      setSubcategoriesLoading(false)
      return
    }
    setSubcategoriesLoading(true)
    let cancelled = false
    subcategoriesService.getNavbarByCategoryId(categoryFromUrl)
      .then((res) => {
        console.log('[SearchPage] navbar subcategories response (full):', res)
        console.log('[SearchPage] navbar subcategories response data:', res?.data)
        const data = res?.data?.data ?? res?.data
        const list = data?.subcategories ?? data ?? []
        console.log('[SearchPage] navbar subcategories parsed', { data, list })
        if (!cancelled) setSubcategories(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.error('[SearchPage] navbar subcategories error:', err)
        if (!cancelled) setSubcategories([])
      })
      .finally(() => { if (!cancelled) setSubcategoriesLoading(false) })
    return () => { cancelled = true }
  }, [sectionIdFromUrl, categoryFromUrl])

  const buildSearchKey = useCallback(
    () => [sectionIdFromUrl, itemsOnlyFromUrl, qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode].join('|'),
    [sectionIdFromUrl, itemsOnlyFromUrl, qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode]
  )

  // Search API: page 1 = replace; page > 1 = append. listPage is internal (no URL page). Infinite scroll increments listPage.
  const runSearch = useCallback(async () => {
    const key = buildSearchKey()
    const isNewSearch = key !== searchKeyRef.current
    const requestPage = isNewSearch ? 1 : listPage
    const isPageOne = requestPage <= 1
    const alreadyLoaded = loadedPagesRef.current.has(requestPage)

    if (isNewSearch) {
      searchKeyRef.current = key
      loadedPagesRef.current = new Set()
      inFlightPagesRef.current = new Set()
      setListPage(1)
    }

    if (alreadyLoaded && !isNewSearch) return
    if (inFlightPagesRef.current.has(requestPage)) return
    inFlightPagesRef.current.add(requestPage)

    if (isPageOne || isNewSearch) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = {
        page: requestPage,
        limit: DEFAULT_LIMIT,
      }
      if (qFromUrl.trim()) params.keyword = qFromUrl.trim()
      if (!itemsOnlyFromUrl && categoryFromUrl) params.categoryId = categoryFromUrl
      if (!itemsOnlyFromUrl && subcategoryFromUrl) params.subcategoryId = subcategoryFromUrl
      if (pincode) params.pinCode = String(pincode)
      const parsed = parseFiltersFromUrl(filtersParam)

      // Extract special filters and pass them as first-class query params
      const pr = parsed?.price_range ?? parsed?.priceRange
      if (Array.isArray(pr) && pr.length >= 2) {
        const min = Number(pr[0])
        const max = Number(pr[1])
        if (!Number.isNaN(min) && !Number.isNaN(max)) params.price = `${min}-${max}`
      } else if (pr && typeof pr === 'object') {
        const min = Number(pr.min ?? pr.priceMin ?? pr.low)
        const max = Number(pr.max ?? pr.priceMax ?? pr.high)
        if (!Number.isNaN(min) && !Number.isNaN(max)) params.price = `${min}-${max}`
      }

      const colorVal = parsed?.color ?? parsed?.colour
      if (colorVal) {
        params.color = Array.isArray(colorVal) ? colorVal.join(',') : String(colorVal)
      }

      // Remaining dynamic filters go inside `filters` for backend matching
      const filtersObj = Object.keys(parsed).length ? { ...parsed } : undefined
      if (filtersObj) {
        delete filtersObj.price_range
        delete filtersObj.priceRange
        delete filtersObj.color
        delete filtersObj.colour
        if (Object.keys(filtersObj).length) params.filters = filtersObj
      }

      // Section navigation: restrict results to section's products only
      if (sectionIdFromUrl) {
        params.sectionId = sectionIdFromUrl
        console.log('[SearchPage] section-scoped search: only section items will be fetched', {
          sectionId: sectionIdFromUrl,
          params: { ...params },
        })
      }

      console.log('[SearchPage] runSearch params', params)

      const res = await itemsService.search(params)
      console.log('[SearchPage] products search response (full):', res)
      console.log('[SearchPage] products search response data:', res?.data)
      const data = res?.data?.data ?? res?.data
      const rawItems = data?.items ?? []
      console.log('[SearchPage] products search raw items:', rawItems)
      const pag = data?.pagination ?? null
      console.log('[SearchPage] products search pagination:', pag)
      const items = rawItems.map(itemToCardProps)

      if (sectionIdFromUrl) {
        console.log('[SearchPage] section-scoped search response', {
          sectionId: sectionIdFromUrl,
          itemsCount: items.length,
          totalFromPagination: pag?.total,
        })
      }

      if (isPageOne || isNewSearch) {
        loadedPagesRef.current = new Set([1])
        setProducts(items)
        setLastAppendedCount(0)
      } else {
        loadedPagesRef.current.add(requestPage)
        setProducts((prev) => [...prev, ...items])
        setLastAppendedCount(items.length)
        setTimeout(() => setLastAppendedCount(0), 600)
      }
      setPagination(pag)
    } catch (err) {
      console.error('[SearchPage] products search error:', err)
      if (isPageOne || isNewSearch) setProducts([])
      setPagination(null)
    } finally {
      inFlightPagesRef.current.delete(requestPage)
      setLoading(false)
      setLoadingMore(false)
    }
  }, [sectionIdFromUrl, qFromUrl, itemsOnlyFromUrl, categoryFromUrl, subcategoryFromUrl, listPage, filtersParam, pincode, buildSearchKey])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const totalPagesForList = totalPagesFromPagination(pagination)
  const hasMoreToLoad = pagination != null && listPage < totalPagesForList

  useEffect(() => {
    const el = loadMoreSentinelRef.current
    if (!el || loading || loadingMore || !hasMoreToLoad) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setListPage((p) => {
          const pag = paginationRef.current
          const tp = totalPagesFromPagination(pag)
          if (pag == null || p >= tp) return p
          const nextP = p + 1
          if (loadedPagesRef.current.has(nextP)) return p
          return nextP
        })
      },
      { root: null, rootMargin: '320px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, loadingMore, hasMoreToLoad, listPage, products.length])

  const handleSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (query.trim()) next.set('q', query.trim())
    else next.delete('q')
    if (sectionIdFromUrl) next.set('sectionId', sectionIdFromUrl)
    if (collectionFromUrl) next.set('collection', collectionFromUrl)
    if (itemsOnlyFromUrl) {
      next.set('itemsOnly', itemsOnlyFromUrl)
      next.delete('categoryId')
      next.delete('subcategoryId')
    } else {
      if (category) next.set('categoryId', category)
      else next.delete('categoryId')
      if (subcategory) next.set('subcategoryId', subcategory)
      else next.delete('subcategoryId')
    }
    next.delete('category')
    next.delete('subcategory')
    next.delete('page')
    setSearchParams(next)
  }

  const handleCategorySelect = (catId) => {
    setCategory(catId)
    setSubcategory('')
    setFilterOpen(false)
    const next = new URLSearchParams(searchParams)
    if (sectionIdFromUrl) next.set('sectionId', sectionIdFromUrl)
    if (collectionFromUrl) next.set('collection', collectionFromUrl)
    if (catId) next.set('categoryId', catId)
    else next.delete('categoryId')
    next.delete('category')
    next.delete('subcategoryId')
    next.delete('subcategory')
    next.delete('page')
    setSearchParams(next)
  }

  const handleSubcategorySelect = (subId) => {
    setSubcategory(subId)
    setFilterOpen(false)
    const next = new URLSearchParams(searchParams)
    if (sectionIdFromUrl) next.set('sectionId', sectionIdFromUrl)
    if (collectionFromUrl) next.set('collection', collectionFromUrl)
    if (categoryFromUrl) next.set('categoryId', categoryFromUrl)
    if (subId) next.set('subcategoryId', subId)
    else next.delete('subcategoryId')
    next.delete('subcategory')
    next.delete('page')
    setSearchParams(next)
  }

  /** For section Our Category: value is "category::id" or "subcategory::id" */
  const handleSectionFilterSelect = (value) => {
    setFilterOpen(false)
    const next = new URLSearchParams(searchParams)
    if (sectionIdFromUrl) next.set('sectionId', sectionIdFromUrl)
    if (collectionFromUrl) next.set('collection', collectionFromUrl)
    if (!value) {
      next.delete('categoryId')
      next.delete('category')
      next.delete('subcategoryId')
      next.delete('subcategory')
    } else {
      const [type, id] = value.split('::')
      if (type === 'subcategory') {
        next.delete('categoryId')
        next.delete('category')
        next.set('subcategoryId', id)
        next.delete('subcategory')
        setCategory('')
        setSubcategory(id)
      } else {
        next.set('categoryId', id)
        next.delete('category')
        next.delete('subcategoryId')
        next.delete('subcategory')
        setCategory(id)
        setSubcategory('')
      }
    }
    next.delete('page')
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

  /** Single-select (radio): for discount, set key to only this value */
  const setFilterSingleValue = (filterKey, value) => {
    const key = (filterKey || '').toLowerCase().trim()
    const val = (value || '').toLowerCase().trim()
    if (!key || !val) return
    setSelectedFilters((prev) => ({ ...prev, [key]: [val] }))
  }

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams)

    // Persist price slider range into URL so backend can filter
    const nextFilters = { ...selectedFilters }
    const min = Math.min(priceRange.min, priceRange.max)
    const max = Math.max(priceRange.min, priceRange.max)
    const defaultMin = 0
    const defaultMax = 50000

    if (min !== defaultMin || max !== defaultMax) {
      nextFilters.price_range = [min, max]
    } else {
      delete nextFilters.price_range
    }

    if (Object.keys(nextFilters).length) next.set('filters', JSON.stringify(nextFilters))
    else next.delete('filters')
    next.delete('page')
    setSearchParams(next)
    setFiltersPanelOpen(false)
  }

  const clearFilters = () => {
    setSelectedFilters({})
    setPriceRange({ min: 0, max: 50000 })
    const next = new URLSearchParams(searchParams)
    next.delete('filters')
    next.delete('page')
    setSearchParams(next)
    setFiltersPanelOpen(false)
  }

  /** Remove a single filter value and refresh URL (used by chips below Filters button) */
  const removeFilterChip = (filterKey, value) => {
    const key = (filterKey || '').toLowerCase().trim()
    const val = (value || '').toLowerCase().trim()
    if (!key || !val) return
    const arr = selectedFilters[key] ? (Array.isArray(selectedFilters[key]) ? [...selectedFilters[key]] : [selectedFilters[key]]) : []
    const idx = arr.indexOf(val)
    if (idx < 0) return
    arr.splice(idx, 1)
    const nextFilters = arr.length === 0
      ? (() => { const o = { ...selectedFilters }; delete o[key]; return o })()
      : { ...selectedFilters, [key]: arr }
    setSelectedFilters(nextFilters)
    const next = new URLSearchParams(searchParams)
    if (Object.keys(nextFilters).length) next.set('filters', JSON.stringify(nextFilters))
    else next.delete('filters')
    next.delete('page')
    setSearchParams(next)
  }

  /** Chips for selected filters: { filterKey, value, displayLabel } */
  const selectedFilterChips = (() => {
    const list = []
    for (const filterKey of Object.keys(selectedFilters)) {
      if (filterKey === 'price_range') continue
      const vals = selectedFilters[filterKey]
      if (!Array.isArray(vals)) continue
      const filterDef = filterList.find((f) => (f.key ?? '').toLowerCase() === filterKey)
      const filterLabel = filterDef?.label ?? filterKey
      for (const val of vals) {
        const valueDef = filterDef?.values?.find((v) => (v.value ?? '').toLowerCase().trim() === (val || '').toLowerCase().trim())
        const displayLabel = valueDef?.label ?? val
        list.push({ filterKey, value: val, displayLabel, filterLabel })
      }
    }
    return list
  })()

  const bannerImage = collectionBanner
  const matchCategoryId = (c) => String(c._id ?? c.id) === String(categoryFromUrl)
  const matchSubcategoryId = (s) => String(s._id ?? s.id) === String(subcategoryFromUrl)
  const categoryLabel =
    showOurProductDropdown || showOurCategoryDropdown
      ? sectionCategories.find(matchCategoryId)?.name ??
      sectionSubcategories.find(matchSubcategoryId)?.name ??
      (categoryFromUrl || subcategoryFromUrl ? 'Collection' : 'Category')
      : categories.find(matchCategoryId)?.name ??
      (subcategoryFromUrl && subcategories.length
        ? subcategories.find((s) => (s._id ?? s.id) === subcategoryFromUrl)?.name
        : null) ??
      (categoryFromUrl || subcategoryFromUrl ? 'Collection' : '')
  const bannerTitle = isFromCollection && categoryLabel
    ? categoryLabel
    : section?.title ?? 'Search'

  // Breadcrumb segments for all flows: Home > [Search / Section / Collections] > [Category?] > [Subcategory?]
  const categoryName = showOurProductDropdown || showOurCategoryDropdown
    ? sectionCategories.find(matchCategoryId)?.name
    : categories.find(matchCategoryId)?.name
  const subcategoryName = showOurCategoryDropdown
    ? sectionSubcategories.find(matchSubcategoryId)?.name
    : subcategories.find(matchSubcategoryId)?.name

  const buildSearchPath = (opts = {}) => {
    const p = new URLSearchParams()
    if (sectionIdFromUrl) p.set('sectionId', sectionIdFromUrl)
    if (collectionFromUrl) p.set('collection', collectionFromUrl)
    if (itemsOnlyFromUrl) p.set('itemsOnly', itemsOnlyFromUrl)
    if (opts.categoryId !== undefined && opts.categoryId) p.set('categoryId', opts.categoryId)
    if (opts.subcategoryId !== undefined && opts.subcategoryId) p.set('subcategoryId', opts.subcategoryId)
    const qs = p.toString()
    return qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH
  }

  const breadcrumbSegments = [{ label: 'Home', to: ROUTES.HOME }]
  if (isSectionScoped) {
    if (collectionFromUrl) {
      breadcrumbSegments.push({ label: 'Collections', to: buildSearchPath({}) })
    } else {
      breadcrumbSegments.push({ label: section?.title ?? 'Search', to: buildSearchPath({}) })
    }
  } else if (isItemsOnlyView) {
    if (sectionIdFromUrl && section?.title) {
      breadcrumbSegments.push({
        label: section.title,
        to: `${ROUTES.SEARCH}?itemsOnly=1&sectionId=${sectionIdFromUrl}`,
      })
    } else {
      breadcrumbSegments.push({ label: 'Search', to: `${ROUTES.SEARCH}?itemsOnly=1` })
    }
  } else {
    breadcrumbSegments.push({ label: 'Search', to: ROUTES.SEARCH })
  }
  if (categoryFromUrl && categoryName) {
    breadcrumbSegments.push({
      label: categoryName,
      to: buildSearchPath({ categoryId: categoryFromUrl }),
    })
  }
  if (subcategoryFromUrl && subcategoryName) {
    breadcrumbSegments.push({ label: subcategoryName, to: null })
  }

  const isLastSegment = (i) => i === breadcrumbSegments.length - 1
  const breadcrumbPillClass = (i) =>
    `inline-flex max-w-[min(100%,14rem)] items-center justify-center truncate rounded-full px-3 py-1 text-xs font-medium tracking-wide transition-colors sm:max-w-none sm:rounded-[22px] sm:px-4 sm:py-1.5 sm:text-sm md:px-5 md:text-base ${isLastSegment(i)
      ? 'bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/80'
      : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200/90 hover:text-neutral-600'
    }`

  const filterBtnClass =
    'font-inter flex items-center gap-1.5 rounded-full border border-black bg-white px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-black transition-colors hover:bg-gray-50 md:gap-2 md:px-4 md:py-2.5 md:text-sm md:tracking-normal'

  const breadcrumb = (
    <div className="bg-white my-3 sm:my-4">
      <div className="mx-4 py-3 sm:mx-6 sm:py-4 md:mx-10">
        <nav
          className="flex flex-col gap-3 font-inter md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3"
          aria-label="Breadcrumb"
        >
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-visible pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 md:flex-wrap md:overflow-x-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            {breadcrumbSegments.map((seg, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1 sm:gap-2">
                {i > 0 && (
                  <IoChevronForwardOutline
                    className="h-3.5 w-3.5 shrink-0 text-neutral-400 sm:h-4 sm:w-4 md:h-5 md:w-5"
                    aria-hidden
                  />
                )}
                {seg.to ? (
                  <Link to={seg.to} className={breadcrumbPillClass(i)} title={seg.label}>
                    {seg.label}
                  </Link>
                ) : (
                  <span className={breadcrumbPillClass(i)} title={seg.label}>
                    {seg.label}
                  </span>
                )}
              </span>
            ))}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end md:w-auto">
            {/* Category dropdown (Our Product) */}
            {showOurProductDropdown && (
              <div className="relative shrink-0">
                <button
                  ref={categoryTriggerRef}
                  type="button"
                  onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                  className={filterBtnClass}
                >
                  <span>{categoryLabel || (collectionFromUrl ? 'Collection' : 'Category')}</span>
                  <span className="inline-flex shrink-0 items-center">
                    <DropdownChevron open={filterOpen} />
                  </span>
                </button>
              </div>
            )}
            {/* Category + Subcategory (Our Category) */}
            {showOurCategoryDropdown && (
              <>
                <div className="relative shrink-0">
                  <button
                    ref={categoryTriggerRef}
                    type="button"
                    onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                    className={filterBtnClass}
                  >
                    <span>{categoryLabel || 'Category'}</span>
                    <span className="inline-flex shrink-0 items-center">
                      <DropdownChevron open={filterOpen} />
                    </span>
                  </button>
                </div>
                {categoryFromUrl && (
                  <div className="relative min-w-[200px] shrink-0 sm:min-w-[220px]">
                    <select
                      value={subcategoryFromUrl}
                      onChange={(e) => handleSubcategorySelect(e.target.value || '')}
                      className={`${filterBtnClass} w-full min-w-0 cursor-pointer appearance-none pl-3 pr-12 sm:pr-14 focus:outline-none focus:ring-2 focus:ring-black/20`}
                    >
                      <option value="">All subcategories</option>
                      {sectionSubcategories.filter((s) => String(s.categoryId ?? s.category ?? '') === String(categoryFromUrl)).map((s) => (
                        <option key={s._id ?? s.id} value={s._id ?? s.id}>{s.name ?? s._id}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex shrink-0 items-center sm:right-4">
                      <DropdownChevron open={false} />
                    </span>
                  </div>
                )}
              </>
            )}
            {/* Category + Subcategory (Global) */}
            {showGlobalCategoryDropdown && (
              <>
                <div className="relative shrink-0">
                  <button
                    ref={categoryTriggerRef}
                    type="button"
                    onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                    className={filterBtnClass}
                  >
                    <span>{categoryLabel || 'All categories'}</span>
                    <span className="inline-flex shrink-0 items-center">
                      <DropdownChevron open={filterOpen} />
                    </span>
                  </button>
                </div>
                {categoryFromUrl && (subcategories.length > 0 || subcategoriesLoading) && (
                  <div className="relative min-w-[200px] shrink-0 sm:min-w-[220px]">
                    <select
                      value={subcategoryFromUrl}
                      onChange={(e) => handleSubcategorySelect(e.target.value || '')}
                      className={`${filterBtnClass} w-full min-w-0 cursor-pointer appearance-none pl-3 pr-12 sm:pr-14 focus:outline-none focus:ring-2 focus:ring-black/20`}
                    >
                      <option value="">All subcategories</option>
                      {subcategories.map((s) => (
                        <option key={s._id ?? s.id} value={s._id ?? s.id}>{s.name ?? s._id}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex shrink-0 items-center sm:right-4">
                      <DropdownChevron open={false} />
                    </span>
                  </div>
                )}
              </>
            )}
            {/* Filters button - no chevron per image */}
            <button type="button" onClick={() => setFiltersPanelOpen(true)} className={filterBtnClass}>
              {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg> */}
              {/* <img src ={Filter}/> */}
              <span>Filter</span>
              <img src={Filter} alt="" className="h-3 w-3 shrink-0 object-contain md:h-4 md:w-4" />
              {Object.keys(selectedFilters).some((k) => (selectedFilters[k]?.length ?? 0) > 0) && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white md:h-5 md:min-w-[20px] md:px-1.5 md:text-xs md:font-medium">
                  {Object.values(selectedFilters).flat().length}
                </span>
              )}
            </button>
          </div>
        </nav>
        {selectedFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
            {selectedFilterChips.map((chip) => (
              <span
                key={`${chip.filterKey}-${chip.value}`}
                className="font-inter inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
              >
                <span>{chip.displayLabel}</span>
                <button
                  type="button"
                  onClick={() => removeFilterChip(chip.filterKey, chip.value)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                  aria-label={`Remove ${chip.displayLabel}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const categoryDropdownPortal = filterOpen && (showOurProductDropdown || showOurCategoryDropdown || showGlobalCategoryDropdown) && categoryDropdownRect && typeof document !== 'undefined' && createPortal(
    <>
      <div className="fixed inset-0 z-100" onClick={() => setFilterOpen(false)} aria-hidden />
      <div
        className={`fixed z-101 w-48 max-h-64 overflow-y-auto py-1 rounded-lg border border-gray-300 bg-white shadow-lg transition-all duration-200 ease-out origin-top-right ${dropdownAnimateOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
          }`}
        style={{
          top: categoryDropdownRect.bottom + 4,
          right: typeof window !== 'undefined' ? window.innerWidth - categoryDropdownRect.right : 0,
        }}
      >
        {showOurProductDropdown && sectionCategories.map((c) => {
          const cid = c._id ?? c.id
          const idStr = String(cid)
          return (
            <button key={idStr} type="button" onClick={() => handleCategorySelect(idStr)} className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(categoryFromUrl) === idStr ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'}`}>
              {c.name ?? idStr}
            </button>
          )
        })}
        {showOurCategoryDropdown && (
          <>
            <button type="button" onClick={() => handleCategorySelect('')} className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!categoryFromUrl ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'}`}>All categories</button>
            {sectionCategories.map((c) => {
              const cid = c._id ?? c.id
              const idStr = String(cid)
              return (
                <button key={`cat-${idStr}`} type="button" onClick={() => handleCategorySelect(idStr)} className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(categoryFromUrl) === idStr ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'}`}>
                  {c.name ?? idStr}
                </button>
              )
            })}
          </>
        )}
        {showGlobalCategoryDropdown && (
          <>
            <button type="button" onClick={() => handleCategorySelect('')} className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!categoryFromUrl ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'}`}>All categories</button>
            {categoriesLoading ? <div className="font-inter px-4 py-2 text-sm text-gray-500">Loading…</div> : categories.map((c) => {
              const cid = c._id ?? c.id
              const idStr = String(cid)
              return (
                <button key={idStr} type="button" onClick={() => handleCategorySelect(idStr)} className={`font-inter w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${String(categoryFromUrl) === idStr ? 'bg-gray-100 font-medium text-black' : 'text-gray-700'}`}>
                  {c.name ?? idStr}
                </button>
              )
            })}
          </>
        )}
      </div>
    </>,
    document.body
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      {/* <div className="relative w-full mt-100  overflow-hidden">
        <img
          src={bannerImage}
          alt=""
          className="block w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="font-raleway text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-wide">
            {bannerTitle}
          </h1>
        </div>
      </div> */}
<div className='mb-30'></div>
      {breadcrumb}
      {pagination?.total != null && !loading && (
        <div className="font-inter border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-600 sm:px-6 md:mx-10">
          <span className="font-semibold tabular-nums text-neutral-900">
            {Number(pagination.total).toLocaleString()}
          </span>
          {' '}
          {pagination.total === 1 ? 'item' : 'items'}
        </div>
      )}
      {categoryDropdownPortal}

      {/* Filters panel - styled like reference: checkboxes, color hex swatches, price slider, discount radio, red accent */}
      {filtersPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-100 bg-black/40"
            onClick={() => setFiltersPanelOpen(false)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-101 w-full max-w-sm bg-white shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Filter by attributes"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-inter text-base font-bold text-gray-900 uppercase tracking-wide">Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersPanelOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtersLoading ? (
                <p className="font-inter text-sm text-gray-500 p-5">Loading filters…</p>
              ) : filterList.length === 0 ? (
                <p className="font-inter text-sm text-gray-500 p-5">No filters available.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filterList.map((f) => {
                    const key = (f.key ?? '').toLowerCase()
                    const label = f.label ?? key
                    const values = f.values ?? []
                    const isColor = key === 'color'
                    const isPriceRange = key === 'price_range'
                    const isDiscount = key === 'discount'
                    const hasSearchIcon = key === 'brand' || key === 'color'
                    const VISIBLE_MAX = 8
                    const isExpanded = expandedFilterKeys.has(key)
                    const visibleValues = isExpanded ? values : values.slice(0, VISIBLE_MAX)
                    const moreCount = values.length - VISIBLE_MAX

                    return (
                      <div key={f._id ?? key} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-inter text-xs font-bold uppercase tracking-wider text-gray-700">{label}</p>
                          {hasSearchIcon && (
                            <button type="button" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={`Search ${label}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {isPriceRange && (
                          <div className="space-y-3">
                            <div
                              ref={priceSliderRef}
                              className="relative h-6 flex items-center"
                              onMouseMove={(e) => {
                                const el = priceSliderRef.current
                                if (!el) return
                                const r = el.getBoundingClientRect()
                                const x = e.clientX - r.left
                                const minPos = (Math.min(priceRange.min, priceRange.max) / 50000) * r.width
                                const maxPos = (Math.max(priceRange.min, priceRange.max) / 50000) * r.width
                                const mid = (minPos + maxPos) / 2
                                setPriceSliderActiveThumb(x < mid ? 'min' : 'max')
                              }}
                              onMouseLeave={() => setPriceSliderActiveThumb('min')}
                            >
                              <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
                              <div
                                className="absolute h-1.5 rounded-full bg-black pointer-events-none"
                                style={{
                                  left: `${(Math.min(priceRange.min, priceRange.max) / 50000) * 100}%`,
                                  right: `${100 - (Math.max(priceRange.min, priceRange.max) / 50000) * 100}%`,
                                }}
                              />
                              <input
                                type="range"
                                min={0}
                                max={50000}
                                step={500}
                                value={Math.min(priceRange.min, priceRange.max)}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  setPriceRange((p) => ({ ...p, min: v, max: Math.max(p.max, v) }))
                                }}
                                className={`absolute w-full h-6 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 ${priceSliderActiveThumb === 'min' ? 'z-20' : 'z-10'}`}
                              />
                              <input
                                type="range"
                                min={0}
                                max={50000}
                                step={500}
                                value={Math.max(priceRange.min, priceRange.max)}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  setPriceRange((p) => ({ ...p, max: v, min: Math.min(p.min, v) }))
                                }}
                                className={`absolute w-full h-6 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-0 ${priceSliderActiveThumb === 'max' ? 'z-20' : 'z-10'}`}
                              />
                            </div>
                            <p className="font-inter text-sm font-semibold text-gray-800">
                              ₹{Math.min(priceRange.min, priceRange.max).toLocaleString('en-IN')} - ₹{Math.max(priceRange.min, priceRange.max).toLocaleString('en-IN')}+
                            </p>
                            {(() => {
                              const buckets = (values || [])
                                .map((v) => {
                                  const parsed = parsePriceRangeBucketValue(v.value)
                                  if (!parsed) return null
                                  return {
                                    label: v.label ?? v.value,
                                    min: parsed.min,
                                    max: parsed.max,
                                  }
                                })
                                .filter(Boolean)
                              if (buckets.length === 0) return null
                              const curMin = Math.min(priceRange.min, priceRange.max)
                              const curMax = Math.max(priceRange.min, priceRange.max)
                              return (
                                <ul className="space-y-2 pt-3 mt-3 border-t border-gray-100">
                                  <li className="font-inter text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    Quick ranges
                                  </li>
                                  {buckets.map((b) => (
                                    <li key={`${b.min}-${b.max}`}>
                                      <label className="font-inter flex items-center gap-3 cursor-pointer py-0.5">
                                        <input
                                          type="radio"
                                          name="filter-price-range-bucket"
                                          checked={curMin === b.min && curMax === b.max}
                                          onChange={() => setPriceRange({ min: b.min, max: b.max })}
                                          className="border-gray-300 text-[#e53935] focus:ring-[#e53935]"
                                        />
                                        <span className="text-sm text-gray-700">{b.label}</span>
                                      </label>
                                    </li>
                                  ))}
                                </ul>
                              )
                            })()}
                          </div>
                        )}

                        {isColor && (
                          <ul className="space-y-2">
                            {visibleValues.map((v) => {
                              const val = v.value ?? ''
                              const displayLabel = v.label ?? val
                              const hex = v.hex ?? '#e5e7eb'
                              const checked = isFilterValueSelected(key, val)
                              return (
                                <li key={val}>
                                  <label className="font-inter flex items-center gap-3 cursor-pointer py-1">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleFilterValue(key, val)}
                                      className="rounded border-gray-300 text-[#e53935] focus:ring-[#e53935]"
                                    />
                                    <span className="h-5 w-5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: hex }} />
                                    <span className="text-sm text-gray-700">{displayLabel}</span>
                                  </label>
                                </li>
                              )
                            })}
                            {moreCount > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleFilterExpanded(key)}
                                className="font-inter text-sm text-[#e53935] font-medium mt-1 hover:underline"
                              >
                                {isExpanded ? 'Show less' : `+ ${moreCount} more`}
                              </button>
                            )}
                          </ul>
                        )}

                        {isDiscount && (
                          <ul className="space-y-2">
                            {values.map((v) => {
                              const val = v.value ?? ''
                              const displayLabel = v.label ?? val
                              const checked = isFilterValueSelected(key, val)
                              return (
                                <li key={val}>
                                  <label className="font-inter flex items-center gap-3 cursor-pointer py-1">
                                    <input
                                      type="radio"
                                      name={`filter-${key}`}
                                      checked={checked}
                                      onChange={() => setFilterSingleValue(key, val)}
                                      className="border-gray-300 text-[#e53935] focus:ring-[#e53935]"
                                    />
                                    <span className="text-sm text-gray-700">{displayLabel}</span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        )}

                        {!isColor && !isPriceRange && !isDiscount && (
                          <ul className="space-y-2">
                            {visibleValues.map((v) => {
                              const val = v.value ?? ''
                              const displayLabel = v.label ?? val
                              const checked = isFilterValueSelected(key, val)
                              return (
                                <li key={val}>
                                  <label className="font-inter flex items-center gap-3 cursor-pointer py-1">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleFilterValue(key, val)}
                                      className="rounded border-gray-300 text-[#e53935] focus:ring-[#e53935]"
                                    />
                                    <span className="text-sm text-gray-700">{displayLabel}</span>
                                  </label>
                                </li>
                              )
                            })}
                            {moreCount > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleFilterExpanded(key)}
                                className="font-inter text-sm text-[#e53935] font-medium mt-1 hover:underline"
                              >
                                {isExpanded ? 'Show less' : `+ ${moreCount} more`}
                              </button>
                            )}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={clearFilters}
                className="font-inter flex-1 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="font-inter flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* Results from search API with filters */}
      <div className=" pb-20">

        {loading ? (
          <div className="font-inter text-gray-500 py-12 text-center">Loading results…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-y-5 md:grid-cols-3 md:gap-y-6 lg:grid-cols-4 lg:gap-y-7">
              {/**
               * Prevent the browser from eagerly downloading/decoding images for every search result.
               * Only load the first few cards eagerly; the rest load lazily.
               */}
              {(() => {
                const EAGER_CARDS = eagerCardsCount
                return products.map((product, index) => {
                  const isNew =
                    lastAppendedCount > 0 &&
                    index >= products.length - lastAppendedCount
                  const imageLoading =
                    index < EAGER_CARDS ? "eager" : "lazy"
                  return (
                    <div
                      key={product.id ?? index}
                      className={`block transition-all duration-500 ease-out ${
                        isNew ? "animate-search-card-in" : ""
                      }`}
                      style={
                        isNew ? { animationFillMode: "backwards" } : undefined
                      }
                    >
                      <ProductCard
                        {...product}
                        rounded="none"
                        imageLoading={imageLoading}
                      />
                    </div>
                  )
                })
              })()}
            </div>
            {products.length > 0 && hasMoreToLoad && (
              <div
                ref={loadMoreSentinelRef}
                className="h-8 w-full shrink-0"
                aria-hidden
              />
            )}
            {loadingMore && (
              <div className="font-inter text-sm text-gray-500 py-4 text-center">Loading more…</div>
            )}
            {!loading && products.length === 0 && (
              <p className="font-inter text-gray-500 py-12 text-center">
                No products found. Try a different search or category.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SearchPage
