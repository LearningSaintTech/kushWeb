import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { IoChevronForwardOutline } from 'react-icons/io5'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useSearchParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ACCESS_TOKEN_KEY } from '../../services/axiosClient.js'
import { addRecentKeyword } from '../../app/store/slices/searchSlice.js'
import collectionBanner from '../../assets/temporary/collection.png'
import { ROUTES, getProductPath } from '../../utils/constants'
import ProductCard from '../../shared/components/ProductCard'
import { itemsService } from '../../services/items.service.js'
import { categoriesService, subcategoriesService } from '../../services/categories.service.js'
import { sectionsService } from '../../services/content.service.js'
import { filtersService } from '../../services/filters.service.js'

const DEFAULT_LIMIT = 12

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

  const sectionIdFromUrl = searchParams.get('sectionId') || ''
  const collectionFromUrl = searchParams.get('collection') || ''
  const itemsOnlyFromUrl = searchParams.get('itemsOnly') || ''
  const categoryFromUrl = searchParams.get('categoryId') || searchParams.get('category') || ''
  const subcategoryFromUrl = searchParams.get('subcategoryId') || searchParams.get('subcategory') || ''
  const qFromUrl = searchParams.get('q') || ''
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
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
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastAppendedCount, setLastAppendedCount] = useState(0)
  const searchKeyRef = useRef('')
  const loadedPagesRef = useRef(new Set())
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 })
  const [priceSliderActiveThumb, setPriceSliderActiveThumb] = useState('min')
  const priceSliderRef = useRef(null)
  const [expandedFilterKeys, setExpandedFilterKeys] = useState(() => new Set())
  const [dropdownAnimateOpen, setDropdownAnimateOpen] = useState(false)
  const [jumpToPageInput, setJumpToPageInput] = useState('')

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
    next.set('page', '1')
    setSearchParams(next)
  }, [sectionIdFromUrl, section?.type, section?.categoryId, section?.subcategoryId, sectionCategories.length, itemsOnlyFromUrl, categoryFromUrl, subcategoryFromUrl])

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
        console.log('[SearchPage] filters response', res)
        const data = res?.data?.data ?? res?.data
        const list = data?.filters ?? []
        console.log('[SearchPage] filters parsed', { data, list })
        setFilterList(Array.isArray(list) ? list : [])
      })
      .catch(() => setFilterList([]))
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
        const data = res?.data?.data ?? res?.data
        console.log('[SearchPage] section fetch result', { raw: res?.data, data, type: data?.type, categoryId: data?.categoryId, subcategoryId: data?.subcategoryId })
        if (cancelled) return
        setSection(data || null)
      })
      .catch((err) => {
        console.log('[SearchPage] section fetch error', err)
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
      categoriesService.getById(id).then((r) => r?.data?.data ?? r?.data).catch((err) => { console.log('[SearchPage] category getById error', id, err); return null })
    )
    const subPromises = subIds.map((id) =>
      subcategoriesService.getById(id).then((r) => r?.data?.data ?? r?.data).catch((err) => { console.log('[SearchPage] subcategory getById error', id, err); return null })
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
        console.log('[SearchPage] section categories load error', err)
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
        const data = res?.data?.data ?? res?.data
        const list = data?.categories ?? []
        if (!cancelled) setCategories(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (!cancelled) setCategories([]) })
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
        const data = res?.data?.data ?? res?.data
        const list = data?.subcategories ?? data ?? []
        if (!cancelled) setSubcategories(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (!cancelled) setSubcategories([]) })
      .finally(() => { if (!cancelled) setSubcategoriesLoading(false) })
    return () => { cancelled = true }
  }, [sectionIdFromUrl, categoryFromUrl])

  const buildSearchKey = useCallback(
    () => [sectionIdFromUrl, itemsOnlyFromUrl, qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode].join('|'),
    [sectionIdFromUrl, itemsOnlyFromUrl, qFromUrl, categoryFromUrl, subcategoryFromUrl, filtersParam, pincode]
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
      if (!itemsOnlyFromUrl && categoryFromUrl) params.categoryId = categoryFromUrl
      if (!itemsOnlyFromUrl && subcategoryFromUrl) params.subcategoryId = subcategoryFromUrl
      if (pincode) params.pinCode = String(pincode)
      const parsed = parseFiltersFromUrl(filtersParam)
      const filtersObj = Object.keys(parsed).length ? parsed : undefined
      if (filtersObj) params.filters = filtersObj

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
      const data = res?.data?.data ?? res?.data
      const items = (data?.items ?? []).map(itemToCardProps)
      const pag = data?.pagination ?? null

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
  }, [sectionIdFromUrl, qFromUrl, itemsOnlyFromUrl, categoryFromUrl, subcategoryFromUrl, pageFromUrl, filtersParam, pincode, buildSearchKey])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  // Keep jump-to input in sync with current page when pagination changes
  useEffect(() => {
    if (pagination?.page != null) setJumpToPageInput('')
  }, [pagination?.page])

  const handleJumpToPage = () => {
    const num = parseInt(jumpToPageInput.trim(), 10)
    if (Number.isNaN(num) || !pagination) return
    const totalPages = Math.max(1, pagination.totalPages ?? 1)
    const page = Math.max(1, Math.min(totalPages, num))
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    setSearchParams(next)
    setJumpToPageInput('')
  }

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
    next.set('page', '1')
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
    next.set('page', '1')
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
    next.set('page', '1')
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

  /** Single-select (radio): for discount, set key to only this value */
  const setFilterSingleValue = (filterKey, value) => {
    const key = (filterKey || '').toLowerCase().trim()
    const val = (value || '').toLowerCase().trim()
    if (!key || !val) return
    setSelectedFilters((prev) => ({ ...prev, [key]: [val] }))
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
    next.set('page', '1')
    setSearchParams(next)
  }

  /** Chips for selected filters: { filterKey, value, displayLabel } */
  const selectedFilterChips = (() => {
    const list = []
    for (const filterKey of Object.keys(selectedFilters)) {
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
    `inline-flex items-center justify-center rounded-[22px] px-5 py-1.5 font-medium tracking-[0.36px] transition-colors ${
      isLastSegment(i)
        ? 'bg-[#F5F5F5] text-gray-700'
        : 'bg-[#F5F5F5] text-[#BDBDBD] hover:bg-neutral-200 hover:text-gray-600'
    }`

  const filterBtnClass = 'font-inter flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2.5 text-black uppercase hover:bg-gray-50 transition-colors'

  const breadcrumb = (
    <div className="bg-white  my-4">
      <div className=" mx-10 py-4">
        <nav className="flex flex-wrap items-center justify-between gap-3 font-inter text-sm" aria-label="Breadcrumb">
          <div className="flex flex-wrap items-center gap-2">
            {breadcrumbSegments.map((seg, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <IoChevronForwardOutline
                    className="h-5 w-5 shrink-0 text-[#BDBDBD]"
                    aria-hidden
                  />
                )}
                {seg.to ? (
                  <Link to={seg.to} className={breadcrumbPillClass(i) + ' text-base sm:text-lg'}>
                    {seg.label}
                  </Link>
                ) : (
                  <span className={breadcrumbPillClass(i) + ' text-base sm:text-lg'}>
                    {seg.label}
                  </span>
                )}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap  items-center gap-2">
            {/* Category dropdown (Our Product) */}
            {showOurProductDropdown && (
              <div className="relative shrink-0">
                <button
                  ref={categoryTriggerRef}
                  type="button"
                  onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
                  className={filterBtnClass}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>{categoryLabel || (collectionFromUrl ? 'Collection' : 'Category')}</span>
                  <span className="inline-flex shrink-0 transition-transform duration-200 ease-out">
                    {filterOpen ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>{categoryLabel || 'Category'}</span>
                    <span className="inline-flex shrink-0 transition-transform duration-200 ease-out">
                      {filterOpen ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
                {categoryFromUrl && (
                  <select value={subcategoryFromUrl} onChange={(e) => handleSubcategorySelect(e.target.value || '')} className={filterBtnClass + ' min-w-[160px] focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer'}>
                    <option value="">All subcategories</option>
                    {sectionSubcategories.filter((s) => String(s.categoryId ?? s.category ?? '') === String(categoryFromUrl)).map((s) => (
                      <option key={s._id ?? s.id} value={s._id ?? s.id}>{s.name ?? s._id}</option>
                    ))}
                  </select>
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>{categoryLabel || 'All categories'}</span>
                    <span className="inline-flex shrink-0 transition-transform duration-200 ease-out">
                      {filterOpen ? <FaChevronUp className="w-4 h-4" /> : <FaChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
                {categoryFromUrl && (subcategories.length > 0 || subcategoriesLoading) && (
                  <select value={subcategoryFromUrl} onChange={(e) => handleSubcategorySelect(e.target.value || '')} className={filterBtnClass + ' min-w-[140px] focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer'}>
                    <option value="">All subcategories</option>
                    {subcategories.map((s) => (
                      <option key={s._id ?? s.id} value={s._id ?? s.id}>{s.name ?? s._id}</option>
                    ))}
                  </select>
                )}
              </>
            )}
            {/* Filters button - no chevron per image */}
            <button type="button" onClick={() => setFiltersPanelOpen(true)} className={filterBtnClass}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {Object.keys(selectedFilters).some((k) => (selectedFilters[k]?.length ?? 0) > 0) && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1.5 text-xs font-medium text-white">{Object.values(selectedFilters).flat().length}</span>
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
      <div className="fixed inset-0 z-[100]" onClick={() => setFilterOpen(false)} aria-hidden />
      <div
        className={`fixed z-[101] w-48 max-h-64 overflow-y-auto py-1 rounded-lg border border-gray-300 bg-white shadow-lg transition-all duration-200 ease-out origin-top-right ${
          dropdownAnimateOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
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
      {categoryDropdownPortal}

      {/* Filters panel - styled like reference: checkboxes, color hex swatches, price slider, discount radio, red accent */}
      {filtersPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={() => setFiltersPanelOpen(false)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-sm bg-white shadow-2xl flex flex-col"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ">
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
            {pagination && pagination.totalPages >= 1 && (() => {
              const totalPages = Math.max(1, pagination.totalPages)
              const currentPage = Math.min(totalPages, Math.max(1, pagination.page ?? 1))
              const totalItems = pagination.total ?? (totalPages * (pagination.limit ?? DEFAULT_LIMIT))
              let start = Math.max(1, currentPage - 2)
              let end = Math.min(totalPages, start + 4)
              if (end - start + 1 < 5) start = Math.max(1, end - 4)
              const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i)
              return (
                <div className="font-inter mt-8 space-y-4">
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
                    <span>{totalItems.toLocaleString()} item{totalItems !== 1 ? 's' : ''}</span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.set('page', String(currentPage - 1))
                        setSearchParams(next)
                      }}
                      className="min-w-9 px-2.5 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {pageNumbers.map((pageNum) => {
                      const isActive = currentPage === pageNum
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
                              ? 'bg-gray-800 text-white border border-gray-800'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.set('page', String(currentPage + 1))
                        setSearchParams(next)
                      }}
                      className="min-w-9 px-2.5 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span className="inline-flex items-center gap-1.5 ml-2 sm:ml-4">
                      <label htmlFor="search-jump-page" className="text-sm text-gray-600 whitespace-nowrap">Go to</label>
                      <input
                        id="search-jump-page"
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpToPageInput}
                        onChange={(e) => setJumpToPageInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                        placeholder={String(currentPage)}
                        className="w-14 px-2 py-1.5 rounded border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                        aria-label="Page number"
                      />
                      <button
                        type="button"
                        onClick={handleJumpToPage}
                        className="px-3 py-1.5 rounded border border-gray-300 bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Go
                      </button>
                    </span>
                  </div>
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
