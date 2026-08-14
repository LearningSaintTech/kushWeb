import { useState, useRef, useEffect } from 'react'
import { debugLog } from '../../utils/debugLog.js';
import { Link } from 'react-router-dom'
import { IoChevronForwardOutline } from 'react-icons/io5'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import ProductCard, { PRODUCT_CARD_COMPACT_GRID_PROPS } from '../../shared/components/ProductCard'
import { listingBindOfferProps } from '../../utils/bindOffer.js'
import { ROUTES } from '../../utils/constants'
// import wishlistBanner from '../../assets/temporary/collection.png'

const PAGE_SIZE = 12
const PAGE_INSET = 'mx-0 lg:mx-12 xl:mx-auto xl:max-w-[1400px]'

function WishlistPage() {
  const { wishlist, wishlistCount, wishlistLoading } = useCartWishlist()
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
    <div className="bg-white my-3 sm:my-4">
      <div className={`${PAGE_INSET} py-3 sm:py-4`}>
        <nav className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 font-inter text-xs sm:text-sm" aria-label="Breadcrumb">
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
        <div className={`${PAGE_INSET} px-2 sm:px-0 py-12 sm:py-16 text-center`}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Your Khushlist is empty
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            Save items you like by clicking the heart on product cards.
          </p>

          <Link
            to={ROUTES.SEARCH}
            className="mt-6 inline-block w-full max-w-xs sm:w-auto px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm sm:text-base"
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
        <div className={`${PAGE_INSET} py-12 sm:py-16 flex items-center justify-center min-h-[200px]`}>
          <p className="text-sm sm:text-base text-gray-500">Loading wishlist…</p>
        </div>
      </div>
    )
  }

  // ✅ WITH ITEMS
  return (
    <div>
      {/* {banner} */}
      {breadcrumb}
      <div className={PAGE_INSET}>
        <div className="flex flex-col gap-1 border-b border-neutral-100 bg-neutral-50/60 px-3 py-2.5 sm:py-3 md:px-4 md:py-3 lg:px-6 lg:py-4">
          <h1 className="text-lg sm:text-xl mt-6   md:text-xl lg:text-3xl font-bold uppercase tracking-wide text-black">
            KHUSHLIST
          </h1>
          <p className="text-[11px] sm:text-xs md:text-[11px] lg:text-sm text-neutral-600">
            <span className="font-semibold tabular-nums text-neutral-900">
              {wishlist.length}
            </span>{' '}
            {wishlist.length === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      <div className={`${PAGE_INSET} px-2 py-4 sm:px-3 sm:py-6 md:px-3 md:py-4 lg:px-0 lg:py-10`}>
        <div
          ref={listRef}
          className="grid grid-cols-2 gap-x-1.5 gap-y-2.5 sm:gap-x-2.5 sm:gap-y-4 md:grid-cols-3 md:gap-x-2 md:gap-y-4 lg:grid-cols-3 lg:gap-x-4 xl:grid-cols-4 xl:gap-x-5 lg:gap-y-8"
        >
          {displayedItems.map((item) => {
            const offerProps = listingBindOfferProps(item)
            if (import.meta.env.DEV) {
              debugLog('[Wishlist][ProductCard] offer props', {
                itemId: item.id,
                title: item.title,
                bindOffer: item.bindOffer,
                offerProps,
              })
            }
            return (
            <div key={item.id} className="flex min-w-0 flex-col">
              <ProductCard
                id={item.id}
                image={item.image}
                hoverImage={item.hoverImage}
                title={item.title}
                shortDescription={item.shortDescription ?? item.description ?? ''}
                stock={item.stock}
                price={item.price}
                originalPrice={item.originalPrice}
                delivery={item.delivery}
                rating={item.rating}
                outOfStock={item.inStock === false}
                isComingSoon={Boolean(item.isComingSoon)}
                launchDate={item.launchDate ?? null}
                {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                imageClassName="w-full max-lg:aspect-[3/4] max-lg:h-auto lg:h-[440px] xl:h-[480px] object-cover object-top lg:object-center"
                infoClassName="px-2 py-2 md:px-2.5 md:py-2.5 lg:px-6 lg:py-5"
                titleClassName="text-[10px] tracking-[0.1em] md:text-[11px] md:tracking-[0.12em] lg:text-lg lg:tracking-widest"
                descriptionClassName="text-[8px] md:text-[9px] lg:text-xs"
                priceRowClassName="mt-1 text-[9px] md:text-[10px] lg:mt-2 lg:text-sm"
                {...offerProps}
              />
            </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <nav
            className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
            aria-label="Wishlist pagination"
          >
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="min-w-9 sm:min-w-10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              Prev
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 sm:min-w-10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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
              className="min-w-9 sm:min-w-10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}

        <div className="mt-6 sm:mt-8 flex justify-center px-2 sm:px-0">
          <Link
            to={ROUTES.SEARCH}
            className="inline-flex w-full max-w-xs sm:w-auto items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm sm:text-base font-medium hover:bg-gray-800 transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default WishlistPage