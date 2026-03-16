import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";
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

const ProductCard = React.memo(function ProductCard({
  id,
  image,
  hoverImage,
  title,
  price,
  delivery,
  rating,
  rounded = "lg",
  roundedTop,
  roundedBottom,
  outOfStock = false,
}) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlist();
  const inWishlist = id != null && isInWishlist(id);
  const [cartError, setCartError] = useState(null);
  const cartErrorTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cartErrorTimeoutRef.current)
        clearTimeout(cartErrorTimeoutRef.current);
    };
  }, []);

  const requireAuth = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal(); // stay on same page after login
      return;
    }
    fn?.(e);
  };
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
  const wrapperProps = id != null ? { to: getProductPath(id) } : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className={`${id != null ? "block " : ""}${cardClassName} relative ${outOfStock ? "pointer-events-none" : ""}`}
      style={cardStyle}
    >
      <div className={outOfStock ? "select-none" : ""}>
        {/* IMAGE */}
        <div
          className={`relative overflow-hidden ${imageRoundedClass}`}
          style={{ ...imageTopStyle, ...imageBottomStyle }}
        >
          <img
            src={image}
            alt={title}
            className="w-full h-[520px] object-cover object-center"
          />

          {hoverImage && (
            <img
              src={hoverImage}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
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
                onClick={requireAuth(() =>
                  toggleWishlist({
                    id,
                    image,
                    hoverImage,
                    title,
                    price,
                    delivery,
                    rating,
                  }),
                )}
                className={`w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm transition-all duration-500 ease-in-out hover:scale-105 cursor-pointer ${
                  inWishlist
                    ? "translate-x-0 opacity-100"
                    : "translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
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
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 ease-in-out delay-100">
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
                onClick={requireAuth(async () => {
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
                    price,
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
                })}
                className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 ease-in-out delay-200 hover:scale-105 cursor-pointer"
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
        </div>

        {/* INFO STRIP */}
        <div
          className={`px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 ${infoIsNumeric ? "" : infoRoundedBottomClass}`}
          style={infoBottomStyle}
        >
          <h3
            className="uppercase tracking-[0.2em] sm:tracking-[0.3em] text-sm sm:text-base md:text-lg text-black"
            style={{ fontFamily: "'Tenor Sans', sans-serif" }}
          >
            {title}
          </h3>

          <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span
              className="text-gray-600 font-medium text-xs sm:text-sm md:text-base"
              style={{ fontFamily: "'Tenor Sans', sans-serif" }}
            >
              {price}
            </span>

            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <span
                className="flex items-center gap-1 sm:gap-2 text-black font-bold text-xs sm:text-sm"
                style={{ fontFamily: "'Baloo 2', sans-serif" }}
              >
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="truncate">{delivery}</span>
              </span>

              {rating != null && rating !== "" && Number(rating) > 0 && (
                <span
                  className="flex items-center gap-0.5 sm:gap-1 shrink-0"
                  style={{ fontFamily: "'Tenor Sans', sans-serif" }}
                >
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {rating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {outOfStock && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <span className="rounded-md bg-black/80 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white">
            Out of stock
          </span>
        </div>
      )}
    </CardWrapper>
  );
});

export default ProductCard;
