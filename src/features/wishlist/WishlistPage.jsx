import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { IoChevronForwardOutline } from 'react-icons/io5'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import ProductCard from '../../shared/components/ProductCard'
import { ROUTES } from '../../utils/constants'
// import wishlistBanner from '../../assets/temporary/collection.png'

const PAGE_SIZE = 12

function WishlistPage() {
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

  const breadcrumbSegments = [
    { label: 'Home', to: ROUTES.HOME },
    { label: 'Wishlist', to: null },
  ]
  const breadcrumbPillClass = (i) => {
    const isLast = i === breadcrumbSegments.length - 1
    return `inline-flex items-center justify-center rounded-[22px] px-5 py-1.5 font-medium tracking-[0.36px] transition-colors text-base sm:text-lg ${
      isLast ? 'bg-[#F5F5F5] text-gray-700' : 'bg-[#F5F5F5] text-[#BDBDBD] hover:bg-neutral-200 hover:text-gray-600'
    }`
  }
  const breadcrumb = (
    <div className="bg-white my-4">
      <div className="mx-10 py-4">
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
                  <Link to={seg.to} className={breadcrumbPillClass(i)}>
                    {seg.label}
                  </Link>
                ) : (
                  <span className={breadcrumbPillClass(i)}>
                    {seg.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )

  // const banner = (
  //   <div className="relative w-full h-screen  overflow-hidden">
  //     <img
  //       src={wishlistBanner}
  //       alt=""
  //       className="absolute inset-0 w-full h-full object-cover object-center"
  //     />
  //     <div className="absolute inset-0 bg-black/40" />
  //     <div className="absolute inset-0 flex items-center justify-center">
  //       <h2 className="font-raleway text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-wide">
  //         Wishlist
  //       </h2>
  //     </div>
  //   </div>
  // )

  // Empty when we're not loading and there are no items (by count and list)
  if (!wishlistLoading && wishlistCount === 0 && wishlist.length === 0) {
    return (
      <div>
        {/* {banner} */}
        {breadcrumb}
        {/* <div className="w-full bg-gray-100 px-10 py-6">
  <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-black">
    WISHLIST
  </h1>
</div> */}
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
        {/* {banner} */}
        {breadcrumb}
    {/* <div className="w-full bg-gray-100 px-10 py-6">
  <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-black">
    WISHLIST
  </h1>
</div> */}
        <div className="py-8 flex items-center justify-center min-h-[200px]">
          <p className="text-gray-500">Loading wishlist…</p>
        </div>
      </div>
    )
  }

  // ✅ WITH ITEMS
  return (
    <div>
      {/* {banner} */}
      {breadcrumb}
      <div className="w-full  px-10 py-6">
  <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-black">
    WISHLIST
  </h1>
</div>
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