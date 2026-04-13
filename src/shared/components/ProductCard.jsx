import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartWishlist } from "../../app/context/CartWishlistContext";
import { getProductPath } from "../../utils/constants";

const ROUNDED_CLASSES = {
  none: "",
  square: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

const ROUNDED_TOP_CLASSES = {
  none: "",
  square: "",
  sm: "rounded-t-sm",
  md: "rounded-t-md",
  lg: "rounded-t-lg",
  xl: "rounded-t-xl",
  "2xl": "rounded-t-2xl",
  "3xl": "rounded-t-3xl",
};

const ROUNDED_BOTTOM_CLASSES = {
  none: "",
  square: "",
  sm: "rounded-b-sm",
  md: "rounded-b-md",
  lg: "rounded-b-lg",
  xl: "rounded-b-xl",
  "2xl": "rounded-b-2xl",
  "3xl": "rounded-b-3xl",
};

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

/** Five stars with partial fills + numeric score (e.g. 3.5 → stars + “3.5”). */
function ProductCardStarRating({ value }) {
  const r = Math.min(5, Math.max(0, Number(value) || 0));
  const label =
    r % 1 === 0 ? `${r} out of 5 stars` : `${r.toFixed(1)} out of 5 stars`;
  const numberText = r % 1 === 0 ? String(r) : r.toFixed(1);

  return (
    <div
      className="flex items-center gap-1 shrink-0"
      role="img"
      aria-label={label}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const fillRatio = Math.min(1, Math.max(0, r - i));
          return (
            <span
              key={i}
              className="relative inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
            >
              <svg
                className="absolute inset-0 h-full w-full text-gray-200"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d={STAR_PATH} />
              </svg>
              {fillRatio > 0 && (
                <span
                  className="absolute left-0 top-0 h-full overflow-hidden"
                  style={{ width: `${fillRatio * 100}%` }}
                >
                  <svg
                    className="block h-3 w-3 sm:h-3.5 sm:w-3.5 text-black"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d={STAR_PATH} />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span
        className="min-w-[1.25rem] tabular-nums text-[10px] font-semibold text-black sm:text-xs"
        style={{ fontFamily: "'Tenor Sans', sans-serif" }}
        aria-hidden
      >
        {numberText}
      </span>
    </div>
  );
}

const ProductCard = React.memo(function ProductCard({
  id,
  image,
  hoverImage,
  title,
  shortDescription,
  price,
  originalPrice,
  delivery,
  rating,
  rounded = "lg",
  roundedTop,
  roundedBottom,
  outOfStock = false,
  shouldRenderImage = true,
  imageLoading = "eager",
  /** Bottom “Buy It Now” bar on image hover (e.g. home Our Products). */
  showBuyNowOnHover = false,
}) {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlist();
  const inWishlist = id != null && isInWishlist(id);
  const [cartError, setCartError] = useState(null);
  const cartErrorTimeoutRef = useRef(null);
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [titleExceedsTwoLines, setTitleExceedsTwoLines] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cartErrorTimeoutRef.current)
        clearTimeout(cartErrorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setTitleExpanded(false);
    setTitleExceedsTwoLines(false);
  }, [title]);

  /** "See more" only when title needs more than 2 lines at this width (not word count). */
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const measure = () => {
      if (titleExpanded) return;
      const overflow = el.scrollHeight > el.clientHeight + 1;
      setTitleExceedsTwoLines(overflow);
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [title, titleExpanded]);

  const imageRounded = roundedTop ?? rounded;
  const infoRounded = roundedBottom ?? rounded;

  const isNumeric = typeof rounded === "number";
  const imageIsNumeric = typeof imageRounded === "number";
  const infoIsNumeric = typeof infoRounded === "number";

  const roundedClass =
    rounded === "none" || rounded === "square"
      ? ""
      : typeof rounded === "string" && ROUNDED_CLASSES[rounded] != null
        ? ROUNDED_CLASSES[rounded]
        : ROUNDED_CLASSES.lg;

  const roundedTopClass =
    imageRounded === "none" || imageRounded === "square"
      ? ""
      : typeof imageRounded === "string" &&
          ROUNDED_TOP_CLASSES[imageRounded] != null
        ? ROUNDED_TOP_CLASSES[imageRounded]
        : ROUNDED_TOP_CLASSES.lg;

  const roundedBottomClass =
    imageRounded === "none" || imageRounded === "square"
      ? ""
      : typeof imageRounded === "string" &&
          ROUNDED_BOTTOM_CLASSES[imageRounded] != null
        ? ROUNDED_BOTTOM_CLASSES[imageRounded]
        : ROUNDED_BOTTOM_CLASSES.lg;

  const infoRoundedBottomClass =
    infoRounded === "none" || infoRounded === "square"
      ? ""
      : typeof infoRounded === "string" &&
          ROUNDED_BOTTOM_CLASSES[infoRounded] != null
        ? ROUNDED_BOTTOM_CLASSES[infoRounded]
        : ROUNDED_BOTTOM_CLASSES.lg;

  const cardStyle = isNumeric ? { borderRadius: `${rounded}px` } : {};
  const imageTopStyle =
    imageIsNumeric && imageRounded > 0
      ? {
          borderTopLeftRadius: imageRounded,
          borderTopRightRadius: imageRounded,
        }
      : {};

  const imageBottomStyle =
    imageIsNumeric && imageRounded > 0
      ? {
          borderBottomLeftRadius: imageRounded,
          borderBottomRightRadius: imageRounded,
        }
      : {};

  const infoBottomStyle =
    infoIsNumeric && infoRounded > 0
      ? {
          borderBottomLeftRadius: infoRounded,
          borderBottomRightRadius: infoRounded,
        }
      : {};

  const cardClassName = `group bg-white overflow-hidden ${isNumeric ? "" : roundedClass}`;

  const imageRoundedClass =
    `${imageIsNumeric ? "" : roundedTopClass} ${imageIsNumeric ? "" : roundedBottomClass}`.trim();

  const CardWrapper = id != null ? Link : "div";
  const wrapperProps =
    id != null ? { to: getProductPath(id, title, shortDescription) } : {};

  const showHoverImage = Boolean(
    hoverImage && hoverImageLoaded && hoverImage !== image,
  );

  return (
    <CardWrapper
      {...wrapperProps}
      onMouseEnter={() => {
        if (hoverImage && !hoverImageLoaded) setHoverImageLoaded(true);
      }}
      onFocus={() => {
        if (hoverImage && !hoverImageLoaded) setHoverImageLoaded(true);
      }}
      className={`${id != null ? "block " : ""}${cardClassName} relative`}
      style={cardStyle}
    >
      <div className={outOfStock ? "select-none" : ""}>
        {/* IMAGE */}
        <div
          className={`relative overflow-hidden ${imageRoundedClass}`}
          style={{ ...imageTopStyle, ...imageBottomStyle }}
        >
          {shouldRenderImage ? (
            <img
              src={image}
              alt={title}
              width={400}
              height={520}
              className="w-full h-[520px] object-cover object-center"
              decoding="async"
              loading={imageLoading}
              fetchPriority={imageLoading === "eager" ? "high" : "auto"}
            />
          ) : (
            // Keep card layout stable, but avoid remote image fetch/decoding.
            <div className="w-full h-[520px] bg-gray-100 object-cover object-center" />
          )}

          {shouldRenderImage && showHoverImage && (
            <img
              src={hoverImage}
              alt=""
              aria-hidden
              width={400}
              height={520}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
              decoding="async"
              loading="eager"
              fetchPriority="low"
            />
          )}

          {/* ACTION ICONS */}
          {id != null && (
            <div
              className="absolute top-6 right-6 flex flex-col gap-4 z-10"
              onClick={(e) => e.stopPropagation()}
              role="group"
              aria-label="Product actions"
            >
              {/* Wishlist */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist({
                    id,
                    image,
                    hoverImage,
                    title,
                    shortDescription,
                    price,
                    originalPrice,
                    delivery,
                    rating,
                  });
                }}
                className={`w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-500 ease-in-out hover:scale-105 cursor-pointer ${
                  inWishlist
                    ? "translate-x-0 opacity-100"
                    : "translate-x-0 opacity-100 md:translate-x-12 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100"
                }`}
                aria-label={
                  inWishlist ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <svg
                  className={`w-5 h-5 ${inWishlist ? "text-black fill-black" : "text-gray-700"}`}
                  fill={inWishlist ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>

              {/* Compare */}
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm translate-x-0 opacity-100 md:translate-x-12 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-500 ease-in-out md:delay-100">
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </div>

              {/* Cart */}
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCartError(null);
                  if (cartErrorTimeoutRef.current) {
                    clearTimeout(cartErrorTimeoutRef.current);
                    cartErrorTimeoutRef.current = null;
                  }
                  const result = await addToCart({
                    id,
                    image,
                    hoverImage,
                    title,
                    shortDescription,
                    price,
                    originalPrice,
                    delivery,
                    rating,
                  });
                  if (result?.success === false && result?.message) {
                    setCartError(result.message);
                    cartErrorTimeoutRef.current = setTimeout(
                      () => setCartError(null),
                      4000,
                    );
                  }
                }}
                className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm translate-x-0 opacity-100 md:translate-x-12 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-500 ease-in-out md:delay-200 hover:scale-105 cursor-pointer"
                aria-label="Add to cart"
              >
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>
              {cartError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black text-white px-5 py-2 rounded-md text-sm shadow-lg">
                  {cartError}
                </div>
              )}
            </div>
          )}

          {id != null && showBuyNowOnHover && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden justify-center px-3 pb-3 pt-0 sm:flex sm:px-4 sm:pb-4 max-md:pointer-events-auto md:group-hover:pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(getProductPath(id, title, shortDescription));
                }}
                className="pointer-events-auto flex h-10 w-[88%] max-w-[240px] max-md:translate-y-0 max-md:opacity-100 items-center justify-center rounded-full bg-black px-4 text-xs font-medium uppercase tracking-wider text-white opacity-0 transition-all duration-300 ease-out md:translate-y-full md:group-hover:translate-y-0 md:group-hover:opacity-100 sm:h-11 sm:px-6 sm:text-sm md:h-11 md:px-8 lg:h-14 lg:px-10 xl:h-[52px] md:text-sm lg:text-[16px] lg:tracking-[2px] cursor-pointer touch-manipulation hover:bg-neutral-900"
              >
                Buy It Now
              </button>
            </div>
          )}
        </div>

        {/* INFO STRIP — on phone + Buy Now below, bottom radius moves to the button row */}
        <div
          className={`px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${
            showBuyNowOnHover ? "max-sm:rounded-b-none" : ""
          } ${infoIsNumeric ? "" : infoRoundedBottomClass}`}
          style={infoBottomStyle}
        >
          <div className="min-w-0">
            <h3
              ref={titleRef}
              className={`break-words uppercase tracking-[0.2em] sm:tracking-widest text-sm sm:text-base md:text-lg text-black leading-snug ${
                !titleExpanded ? "line-clamp-2" : ""
              }`}
              style={{ fontFamily: "'Tenor Sans', sans-serif" }}
            >
              {title}
            </h3>
            {titleExceedsTwoLines && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTitleExpanded((v) => !v);
                }}
                className="mt-1 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-600 underline decoration-gray-400 underline-offset-2 hover:text-black"
              >
                {titleExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>

          {/* One row: price (left) · delivery + clock (center) · 5 stars only (right) — matches product card reference */}
          <div className="mt-1.5 flex w-full min-w-0 items-center gap-x-2 text-[11px] sm:mt-2 sm:text-xs md:text-sm">
            <div
              className="flex shrink-0 items-center gap-1.5"
              style={{ fontFamily: "'Tenor Sans', sans-serif" }}
            >
              <span className="shrink-0 text-gray-700 font-semibold">
                {price}
              </span>
              {originalPrice && (
                <span className="shrink-0 text-gray-400 line-through">
                  {originalPrice}
                </span>
              )}
            </div>

            {delivery ? (
              <div
                className="flex min-h-[1.25rem] min-w-0 flex-1 items-center justify-center gap-1 px-0.5 text-black"
                style={{ fontFamily: "'Baloo 2', sans-serif" }}
              >
                {/* <svg
                  className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg> */}
                {/* <span className="truncate text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs">
                  {delivery}
                </span> */}
              </div>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}

            {rating != null && rating !== "" && Number(rating) > 0 && (
              <div className="shrink-0">
                <ProductCardStarRating value={rating} />
              </div>
            )}
          </div>
        </div>

        {/* Phone: full-width Buy It Now at bottom of card (below title/price) */}
        {id != null && showBuyNowOnHover && (
          <div
            className={`sm:hidden border-t border-gray-100 bg-white px-3 pb-3 pt-3 ${
              infoIsNumeric ? "" : infoRoundedBottomClass
            }`}
            style={infoBottomStyle}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(getProductPath(id, title, shortDescription));
              }}
              className="flex h-11 w-full max-w-full items-center justify-center rounded-full bg-black px-4 text-xs font-medium uppercase tracking-wider text-white cursor-pointer touch-manipulation hover:bg-neutral-900 active:bg-neutral-800"
            >
              Buy It Now
            </button>
          </div>
        )}
      </div>
    {outOfStock && (
  <div className="absolute top-3 left-3 z-20 pointer-events-none">
    <span className="bg-black text-white px-3 py-2 text-[10px] font-medium uppercase tracking-wider">
      OUT OF STOCK
    </span>
  </div>
)}
    </CardWrapper>
  );
});

export default ProductCard;
