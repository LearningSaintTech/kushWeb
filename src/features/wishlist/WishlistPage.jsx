import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import ProductCard from '../../shared/components/ProductCard'
import { ROUTES } from '../../utils/constants'
import wishlistBanner from '../../assets/temporary/collection.png'

const PAGE_SIZE = 12

function WishlistPage() {
  const navigate = useNavigate()
  const { wishlist, wishlistDeliveries, wishlistCount, wishlistLoading } = useCartWishlist()
  const [currentPage, setCurrentPage] = useState(1)
  const listRef = useRef(null)

  const totalPages = Math.max(1, Math.ceil(wishlist.length / PAGE_SIZE))
  const start = (currentPage - 1) * PAGE_SIZE
  const displayedItems = wishlist.slice(start, start + PAGE_SIZE)

  // Reset to page 1 when wishlist length changes (e.g. item removed elsewhere)
  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(1)
  }, [wishlist.length, totalPages, currentPage])

  // Smooth: scroll list into view when page changes (no full reload)
  useEffect(() => {
    if (currentPage > 1 && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentPage])

  const goToPage = (page) => {
    const next = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(next)
  }

  const breadcrumb = (
    <div className=" mx-auto px-4 py-4 border-b border-gray-100">
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
        <Link to={ROUTES.HOME} className="text-gray-500 hover:text-black transition-colors">
          Home
        </Link>
        <span className="text-gray-400" aria-hidden>/</span>
        <Link to={ROUTES.WISHLIST} className="text-gray-900 font-medium">
          Wishlist
        </Link>
      </nav>
    </div>
  )

  const banner = (
    <div className="relative w-full h-screen  overflow-hidden">
      <img
        src={wishlistBanner}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="font-raleway text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-wide">
          Wishlist
        </h2>
      </div>
    </div>
  )

  // Empty when we're not loading and there are no items (by count and list)
  if (!wishlistLoading && wishlistCount === 0 && wishlist.length === 0) {
    return (
      <div>
        {banner}
        {breadcrumb}

        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Your wishlist is empty
          </h1>
          <p className="mt-2 text-gray-600">
            Save items you like by clicking the heart on product cards.
          </p>

          <Link
            to={ROUTES.SEARCH}
            className="mt-6 inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Explore products
          </Link>
        </div>
      </div>
    )
  }

  // Loading: we have ids (wishlistCount > 0) but getItems hasn't populated wishlist yet
  if (wishlistLoading || (wishlistCount > 0 && wishlist.length === 0)) {
    return (
      <div>
        {banner}
        {breadcrumb}
        <div className="py-8 flex items-center justify-center min-h-[200px]">
          <p className="text-gray-500">Loading wishlist…</p>
        </div>
      </div>
    )
  }

  // ✅ WITH ITEMS
  return (
    <div>
      {banner}
      {breadcrumb}

      <div className="py-8">
       

        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ">
          {displayedItems.map((item) => (
            <div key={item.id} className="flex flex-col">
              <ProductCard
                id={item.id}
                image={item.image}
                hoverImage={item.hoverImage}
                title={item.title}
                price={item.price}
                delivery={item.delivery}
                rating={item.rating}
                rounded="none"
              />
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label="Wishlist pagination"
          >
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="min-w-10 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-10 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage
                      ? 'bg-black text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="min-w-10 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            to={ROUTES.SEARCH}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default WishlistPage