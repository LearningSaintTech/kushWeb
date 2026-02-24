import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProductCard from '../../shared/components/ProductCard'
import { sectionsService } from '../../services/content.service.js'
import { itemsService } from '../../services/items.service.js'

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
    : '—'
  const delivery = item.deliveryType === '90_MIN'
    ? '90 min delivery'
    : item.deliveryType === 'ONE_DAY'
      ? '1 day delivery'
      : item.deliveryType ? String(item.deliveryType) : '—'
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

export function SectionExplorePage() {
  const { sectionId } = useParams()
  const pincode = useSelector((s) => s?.location?.pincode) ?? null
  const [section, setSection] = useState(null)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const loadSection = useCallback(async () => {
    if (!sectionId) return
    try {
      const res = await sectionsService.getSingle(sectionId)
      const data = res?.data?.data ?? res?.data
      setSection(data || null)
    } catch (e) {
      setError(e?.message ?? 'Section not found')
      setSection(null)
    }
  }, [sectionId])

  const loadProducts = useCallback(async () => {
    if (!sectionId) return
    setLoading(true)
    setError(null)
    try {
      const params = { sectionId, page, limit: DEFAULT_LIMIT }
      if (pincode) params.pinCode = String(pincode)
      const res = await itemsService.search(params)
      const data = res?.data?.data ?? res?.data
      const items = (data?.items ?? []).map(itemToCardProps)
      setProducts(items)
      setPagination(data?.pagination ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load products')
      setProducts([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [sectionId, page, pincode])

  useEffect(() => {
    loadSection()
  }, [loadSection])

  useEffect(() => {
    if (sectionId) loadProducts()
    else setProducts([])
  }, [sectionId, loadProducts])

  if (!sectionId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Missing section.</p>
        <Link to="/" className="text-black underline mt-4 inline-block">Back to home</Link>
      </div>
    )
  }

  if (error && !section) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="text-black underline mt-4 inline-block">Back to home</Link>
      </div>
    )
  }

  const totalPages = pagination?.totalPages ?? 0
  const hasMore = page < totalPages

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="text-black underline text-sm">← Back to home</Link>
        <h1 className="font-raleway text-2xl sm:text-4xl font-extrabold tracking-wide text-black mt-4">
          {section?.title ?? 'Section'}
        </h1>
      </div>

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
