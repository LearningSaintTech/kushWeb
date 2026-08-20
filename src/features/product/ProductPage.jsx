import { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { debugLog, debugError } from '../../utils/debugLog.js';
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaTag } from "react-icons/fa6";
import { RiFileList2Line, RiRefreshLine, RiTruckLine } from "react-icons/ri";
import { FaHandHoldingHeart } from "react-icons/fa";
import { itemsService } from "../../services/items.service.js"
import { deliveryService } from "../../services/delivery.service.js";
import { useAuth } from "../../app/context/AuthContext";
import { useCartWishlist } from "../../app/context/CartWishlistContext";
import { ROUTES } from "../../utils/constants";
import productImage from "../../assets/temporary/productimage.png";
import ReviewRating from "./components/ReviewRating";
import WriteReviewModal from "./components/WriteReviewModal";
import RelatedProducts from "./components/RelatedProducts";
import JustForYouProducts from "./components/JustForYouProducts";
import { FaShareSquare } from "react-icons/fa";
import { RiTShirtAirLine } from "react-icons/ri";
import SizeChart from "./components/Sizechart.jsx";
import { trackEvent, trackPixelAddToCart, trackPixelViewItem } from "../../analytics";
import {
  getMediaTypeFromEntry,
  isVideoUrlString,
} from "../../utils/mediaUrl.js";
import BindOfferBadge from "../../shared/components/BindOfferBadge.jsx";
import {
  ProductImageZoomLightbox,
} from "../../shared/components/ZoomImage.jsx";
import { getProductCardOfferBadge, getOfferHint } from "../../utils/bindOffer.js";
import {
  formatLaunchDate,
  isItemComingSoon,
} from "../../utils/productLaunch.js";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pincode = useSelector((s) => s?.location?.pincode) ?? null;
  const { isAuthenticated, user } = useAuth();
  const { cart, addToCart, toggleWishlist, isInWishlist } = useCartWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [expandedSection, setExpandedSection] = useState("details");
  const [shortDescExpanded, setShortDescExpanded] = useState(false);
  const [longDescExpanded, setLongDescExpanded] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [displayAvgRating, setDisplayAvgRating] = useState(null);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState(
    [],
  );
  const galleryTouchStartX = useRef(null);
  const galleryAutoPausedRef = useRef(false);
  const shortDescRef = useRef(null);
  const reviewsSectionRef = useRef(null);
  const [shortDescExceedsTwoLines, setShortDescExceedsTwoLines] =
    useState(false);

  /** Chars above this show See more for long description */
  const LONG_DESC_COLLAPSE_THRESHOLD = 260;

  // Fetch delivery options by pincode for dropdown
  useEffect(() => {
    if (!pincode || !String(pincode).trim()) {
      setDeliveryOptionsFromPincode([]);
      return;
    }
    deliveryService
      .checkByPincode(String(pincode).trim())
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const options = data?.deliveryOptions ?? [];
        setDeliveryOptionsFromPincode(Array.isArray(options) ? options : []);
      })
      .catch(() => setDeliveryOptionsFromPincode([]));
  }, [pincode]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid product");
      return;
    }
    setLoading(true);
    setError(null);
    const params = pincode ? { pincode: String(pincode) } : {};
    itemsService
      .getById(id, params)
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const item = data?.item ?? data;
        debugLog("[ProductPage] product details API response:", {
          dataKeys: data ? Object.keys(data) : [],
          hasItem: !!item,
          itemId: item?._id,
          variantsCount: item?.variants?.length,
        });
        if (item?.variants?.length) {
          item.variants.forEach((v, i) => {
            debugLog("[ProductPage] API variant[" + i + "]:", {
              color: v.color?.name,
              sizesCount: v.sizes?.length,
              sizes: v.sizes?.map((s) => ({
                size: s.size,
                sku: s.sku,
                stock: s.stock,
                inStock: s.inStock,
                availableQuantity: s.availableQuantity,
              })),
            });
          });
        }
        if (!item) {
          setError("Product not found");
          setItemData(null);
          return;
        }
        setItemData({ item, deliveries: data?.deliveries ?? [] });
        setDisplayAvgRating(
          item?.avgRating != null && Number(item.avgRating) > 0
            ? Number(item.avgRating)
            : null,
        );
        setSelectedImageIndex(0);
        setShortDescExpanded(false);
        setLongDescExpanded(false);
        // Auto-select first available color and size so Buy Now / Add to Cart are enabled on first visit
        if (item?.variants?.length) {
          let firstAvailableColor = null;
          let firstAvailableSize = null;
          for (const v of item.variants) {
            const firstInStock = v.sizes?.find((s) => {
              const qty = Number(s.availableQuantity ?? s.stock ?? 0);
              return s.inStock === true || (s.inStock !== false && qty > 0);
            });
            if (firstInStock) {
              firstAvailableColor = v.color?.name ?? null;
              firstAvailableSize = firstInStock.size;
              break;
            }
          }
          setSelectedColor(
            firstAvailableColor ?? item.variants[0]?.color?.name ?? null,
          );
          setSelectedSize(
            firstAvailableSize ?? item.variants[0]?.sizes?.[0]?.size ?? null,
          );
        } else {
          setSelectedColor(null);
          setSelectedSize(null);
        }
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load product",
        );
        setItemData(null);
      })
      .finally(() => setLoading(false));
  }, [id, pincode]);

  const item = itemData?.item;
  const deliveries = itemData?.deliveries ?? [];
  const handleReviewSummaryChange = useCallback((summary) => {
    const avg = Number(summary?.averageRating);
    setDisplayAvgRating(Number.isFinite(avg) && avg > 0 ? avg : null);
  }, []);
  const shownAvgRating =
    displayAvgRating != null && Number(displayAvgRating) > 0
      ? Number(displayAvgRating)
      : item?.avgRating != null && Number(item.avgRating) > 0
        ? Number(item.avgRating)
        : null;
  const bindOfferBadge = useMemo(
    () => getProductCardOfferBadge(item?.bindOffer),
    [item?.bindOffer],
  );
  const bindOfferHint = useMemo(
    () => getOfferHint(item?.bindOffer),
    [item?.bindOffer],
  );

  const colors = useMemo(() => {
    if (!item?.variants?.length) return [];
    return item.variants.map((v) => ({
      id: v.color?.name,
      name: v.color?.name,
      value: v.color?.hex || "#666",
    }));
  }, [item]);

  const selectedVariant = useMemo(() => {
    if (!item?.variants?.length) return null;

    if (!selectedColor) return item.variants[0];

    return item.variants.find((v) => v.color?.name === selectedColor);
  }, [item, selectedColor]);

  const images = useMemo(() => {
    if (!selectedVariant?.images?.length) {
      if (item?.thumbnail) {
        return [
          {
            url: item.thumbnail,
            type: isVideoUrlString(item.thumbnail) ? "video" : "image",
          },
        ];
      }
      return [{ url: productImage, type: "image" }];
    }
    const sorted = [...selectedVariant.images].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    return sorted
      .filter((m) => m?.url)
      .map((m) => ({ url: m.url, type: getMediaTypeFromEntry(m) }));
  }, [selectedVariant, item?.thumbnail]);

  // First non-video URL — used for cart/wishlist thumbnails so they never receive an mp4 source.
  const firstImageUrl = useMemo(() => {
    const variantSorted = [...(selectedVariant?.images || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const firstImg = variantSorted.find(
      (m) => m?.url && getMediaTypeFromEntry(m) === "image",
    );
    if (firstImg?.url) return firstImg.url;
    if (item?.thumbnail && !isVideoUrlString(item.thumbnail)) return item.thumbnail;
    return "";
  }, [selectedVariant, item?.thumbnail]);

  const hoverImageUrl = useMemo(() => {
    const variantSorted = [...(selectedVariant?.images || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const imageEntries = variantSorted.filter(
      (m) => m?.url && getMediaTypeFromEntry(m) === "image",
    );
    return imageEntries[1]?.url ?? firstImageUrl;
  }, [selectedVariant, firstImageUrl]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariant]);

  useEffect(() => {
    setSelectedImageIndex((i) => Math.min(i, Math.max(0, images.length - 1)));
  }, [images.length]);

  const sizes = useMemo(() => {
    if (!selectedVariant?.sizes?.length) return [];
    return selectedVariant.sizes.map((s) => {
      const qty = Number(s.availableQuantity ?? s.stock ?? 0);
      const inStock = s.inStock === true || (s.inStock !== false && qty > 0);
      return {
        size: s.size,
        sku: s.sku,
        inStock,
      };
    });
  }, [selectedVariant]);

  // When color changes, if current size is unavailable in new variant, select first available size
  useEffect(() => {
    if (!sizes.length) return;
    const currentInList = sizes.find(
      (s) => String(s.size).trim() === String(selectedSize).trim(),
    );
    const currentAvailable = currentInList?.inStock;
    if (!currentInList || !currentAvailable) {
      const firstAvailable = sizes.find((s) => s.inStock);
      setSelectedSize(firstAvailable ? firstAvailable.size : sizes[0].size);
    }
  }, [sizes, selectedSize]);

  const imageSlideIndex = Math.min(
    selectedImageIndex,
    Math.max(0, images.length - 1),
  );
  const mainMedia =
    images[imageSlideIndex] ?? images[0] ?? { url: productImage, type: "image" };

  const GALLERY_AUTO_INTERVAL_MS = 4000;
  const GALLERY_AUTO_RESUME_MS = 6000;

  useEffect(() => {
    if (images.length < 2 || imageZoomOpen) return undefined;

    let intervalId = null;

    const clearAuto = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startAuto = () => {
      clearAuto();
      if (!window.matchMedia("(max-width: 639px)").matches) return;
      intervalId = setInterval(() => {
        if (galleryAutoPausedRef.current) return;
        setSelectedImageIndex((i) =>
          i >= images.length - 1 ? 0 : i + 1,
        );
      }, GALLERY_AUTO_INTERVAL_MS);
    };

    const mq = window.matchMedia("(max-width: 639px)");
    const onMqChange = () => startAuto();

    startAuto();
    mq.addEventListener("change", onMqChange);

    return () => {
      clearAuto();
      mq.removeEventListener("change", onMqChange);
    };
  }, [images.length, imageZoomOpen]);

  const pauseGalleryAuto = () => {
    galleryAutoPausedRef.current = true;
    window.setTimeout(() => {
      galleryAutoPausedRef.current = false;
    }, GALLERY_AUTO_RESUME_MS);
  };

  const selectedSizeObj = sizes.find(
    (s) => String(s.size).trim() === String(selectedSize).trim(),
  );

  const priceDisplay =
    item?.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : item?.price != null
        ? `₹${Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : null;

  // Prefer pincode-check delivery options; fallback to item API deliveries
  const deliveryOptions =
    deliveryOptionsFromPincode.length > 0
      ? deliveryOptionsFromPincode
      : deliveries;
  const deliveryText = useMemo(() => {
    if (deliveryOptions.some((d) => d.deliveryType === "90_MIN"))
      return "90 min";
    if (deliveryOptions.some((d) => d.deliveryType === "ONE_DAY"))
      return "1 day";
    return (
      item?.shipping?.estimatedDelivery ||
      item?.shipping?.title ||
      "⊙ Check delivery"
    );
  }, [deliveryOptions, item?.shipping]);

  const originalPriceDisplay =
    item?.discountedPrice != null &&
    item?.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? `₹${Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : null;

  const productForCart = useMemo(() => {
    if (!item || !selectedVariant || !selectedSizeObj) return null;
    const imageUrl = firstImageUrl || "";
    return {
      id: item._id,
      _id: item._id,
      title: item.name,
      price: priceDisplay,
      originalPrice: originalPriceDisplay ?? undefined,
      image: imageUrl,
      hoverImage: hoverImageUrl || imageUrl,
      delivery: deliveryText,
      rating: item.avgRating ?? 4,
      variant: {
        color: selectedVariant.color?.name ?? selectedColor,
        size: selectedSizeObj.size,
        sku: selectedSizeObj.sku,
        imageUrl,
      },
      sku: selectedSizeObj.sku,
    };
  }, [
    item,
    selectedVariant,
    selectedSizeObj,
    selectedColor,
    priceDisplay,
    originalPriceDisplay,
    deliveryText,
    firstImageUrl,
    hoverImageUrl,
  ]);

  debugLog("[ProductPage] product details state:", {
    hasItem: !!item,
    itemId: item?._id,
    selectedColor,
    selectedSize,
    selectedVariant: !!selectedVariant,
    sizesCount: sizes.length,
    sizes,
    selectedSizeObj: selectedSizeObj
      ? {
          size: selectedSizeObj.size,
          sku: selectedSizeObj.sku,
          inStock: selectedSizeObj.inStock,
        }
      : null,
    productForCart: productForCart
      ? { id: productForCart.id, sku: productForCart.sku }
      : null,
    buttonsDisabled: !productForCart || !selectedSizeObj?.inStock,
    whyDisabled: !item
      ? "no item"
      : !selectedVariant
        ? "no selectedVariant"
        : !selectedSizeObj
          ? "no selectedSizeObj (selectedSize=" + selectedSize + ")"
          : !selectedSizeObj?.inStock
            ? "selectedSizeObj.inStock is false"
            : "ok",
  });

  const itemIdStr = item?._id != null ? String(item._id) : null;
  const inWishlist = itemIdStr != null && isInWishlist(itemIdStr);
  const inCart = useMemo(() => {
    if (!productForCart) return false;
    if (isAuthenticated)
      return (cart || []).some(
        (c) => String(c?.sku) === String(productForCart.sku),
      );
    return (cart || []).some((c) => String(c?.id) === itemIdStr);
  }, [cart, productForCart, isAuthenticated, itemIdStr]);

  const handleAddToCart = async () => {
    debugLog("Add to cart clicked", productForCart, selectedSizeObj);
    if (!productForCart || !selectedSizeObj?.inStock) return;

    const result = await addToCart(productForCart, pincode);

    if (result?.success === false && result?.message) {
      setCartError(result.message);
      return;
    }

    trackPixelAddToCart({
      id: productForCart.id,
      name: productForCart.title,
      price: productForCart.price,
      quantity: 1,
      sku: productForCart.sku,
    });

    trackEvent({
      eventType: "add_to_cart",
      itemId: productForCart?.id ? String(productForCart.id) : undefined,
      sku: productForCart?.sku ? String(productForCart.sku) : undefined,
      quantity: 1,
      price: Number(productForCart.price?.replace(/[^\d.]/g, "")) || 0,
      currency: "INR",
    });

    setAddedToCart(true);
  };

  const handleWishlist = () => {
    if (!item) return;
    const imageUrl = firstImageUrl || "";
    const hoverUrl = hoverImageUrl || imageUrl;
    toggleWishlist({
      id: itemIdStr ?? item._id,
      title: item.name,
      price: priceDisplay,
      image: imageUrl,
      hoverImage: hoverUrl,
      delivery: deliveryText,
      rating: item.avgRating ?? 4,
    });
  };

  const handleShare = async () => {
    if (!item?._id) return;

    try {
      const url = `${window.location.origin}/product/${item._id}`;
      await navigator.clipboard.writeText(url);

      trackEvent({
        eventType: "share_click",
        itemId: String(item._id),
        path: url,
      });
      setCopyMsg("Link copied");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch (err) {
      debugError("Error copying link:", err);
    }
  };

  const fireBuyNowAddToCartPixel = () => {
    trackPixelAddToCart({
      id: productForCart.id,
      name: productForCart.title,
      price: productForCart.price,
      quantity: 1,
      sku: productForCart.sku,
      skipDedupe: true,
    });
  };

  const handleBuyNow = async () => {
    if (!productForCart || !selectedSizeObj?.inStock) return;
    setCartError(null);
    /** Same SKU already in cart — go to cart without calling add again */
    if (!inCart) {
      const result = await addToCart(productForCart, pincode);
      if (result?.success === false && result?.message) {
        setCartError(result.message);
        setTimeout(() => setCartError(null), 4000);
        return;
      }
    }
    fireBuyNowAddToCartPixel();
    navigate(ROUTES.CART);
  };

  const productViewTrackedRef = useRef(null);

  useEffect(() => {
    if (!item?._id) return;
    const id = String(item._id);
    if (productViewTrackedRef.current === id) return;
    productViewTrackedRef.current = id;

    const price =
      item.discountedPrice != null
        ? Number(item.discountedPrice)
        : item.price != null
          ? Number(item.price)
          : undefined;
    trackPixelViewItem({
      id,
      name: item.name,
      price,
    });
    trackEvent({
      eventType: "product_view",
      itemId: id,
      price,
      currency: "INR",
    });
  }, [item]);

  const toggleSection = (key) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const handleOpenReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const currentUserId = user?._id ?? user?.id ?? null;

  const handleOpenWriteReview = () => {
    setReviewModalOpen(true);
  };

  const shortDescText = (item?.shortDescription ?? "").trim();
  const longDescText = (item?.longDescription ?? "").trim();
  const longDescNeedsMore = longDescText.length > LONG_DESC_COLLAPSE_THRESHOLD;

  const careBulletPoints = useMemo(() => {
    const raw = item?.care?.description ?? "";
    return String(raw)
      .replace(/\r/g, "")
      .split(/[\n•]+|(?<=\.)\s+/)
      .map((x) => x.replace(/^[\-\s•]+|[\s.]+$/g, "").trim())
      .filter(Boolean);
  }, [item?.care?.description]);

  useLayoutEffect(() => {
    const el = shortDescRef.current;
    if (!el || shortDescExpanded) return;

    const measure = () => {
      setShortDescExceedsTwoLines(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [shortDescText, shortDescExpanded]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-100 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] font-inter sm:pt-28 sm:pb-[max(3rem,env(safe-area-inset-bottom,0px))] md:pt-32 md:pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] lg:pt-36 lg:pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 py-16 sm:px-6 sm:py-20 md:px-8 lg:px-[6vw]">
          <p className="text-sm sm:text-base text-gray-500">Loading product…</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-dvh bg-gray-100 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] font-inter sm:pt-28 sm:pb-[max(3rem,env(safe-area-inset-bottom,0px))] md:pt-32 md:pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] lg:pt-36 lg:pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20 md:px-8 lg:px-[6vw]">
          <p className="px-4 text-center text-sm text-gray-600 sm:text-base">
            {error || "Product not found"}
          </p>
        </div>
      </div>
    );
  }

  if (isItemComingSoon(item)) {
    const launchDateLabel = formatLaunchDate(item.launchDate);
    return (
      <div className="min-h-dvh bg-gray-100 px-4 pb-12 pt-28 font-inter sm:pt-32 lg:pt-36">
        <div className="mx-auto max-w-xl overflow-hidden bg-white shadow-sm">
          <div className="relative aspect-[4/5] overflow-hidden bg-neutral-200">
            <img
              src={firstImageUrl || item.thumbnail || productImage}
              alt=""
              className="h-full w-full scale-105 object-cover object-top blur-[8px]"
              aria-hidden
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 px-6 text-center text-white">
              <svg
                className="mb-5 h-16 w-16 text-white/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
              <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">
                Coming Soon
              </h1>
              <p className="mt-3 text-sm uppercase tracking-widest text-white/85">
                {launchDateLabel
                  ? `Launching on ${launchDateLabel}`
                  : "Launching soon"}
              </p>
              <Link
                to={ROUTES.HOME}
                className="mt-8 border-b border-white pb-1 text-xs uppercase tracking-widest"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 min-h-dvh bg-gray-100 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] font-inter sm:pt-28 sm:pb-[max(3rem,env(safe-area-inset-bottom,0px))] md:pt-32 md:pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] lg:pt-36 lg:pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
      <div className="px-4 sm:px-6 md:px-8 lg:px-[6vw]">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8  lg:gap-6  xl:gap-8">
          {/* LEFT SIDE - Gallery */}
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            {/* Phone only: swipe carousel + dots (sm+ keeps main image + thumbnails below) */}
            <div className="sm:hidden w-full max-w-full bg-gray-100 overflow-hidden rounded-none">
              <div
                className="relative aspect-square w-full max-w-full overflow-hidden bg-gray-100 touch-pan-y"
                onTouchStart={(e) => {
                  galleryTouchStartX.current = e.touches[0].clientX;
                  pauseGalleryAuto();
                }}
                onTouchEnd={(e) => {
                  if (galleryTouchStartX.current == null || images.length < 2) {
                    galleryTouchStartX.current = null;
                    return;
                  }
                  const dx =
                    e.changedTouches[0].clientX - galleryTouchStartX.current;
                  galleryTouchStartX.current = null;
                  if (Math.abs(dx) < 44) return;
                  pauseGalleryAuto();
                  if (dx < 0) {
                    setSelectedImageIndex((i) =>
                      Math.min(images.length - 1, i + 1),
                    );
                  } else {
                    setSelectedImageIndex((i) => Math.max(0, i - 1));
                  }
                }}
              >
                <div
                  className="flex h-full w-full transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(-${imageSlideIndex * 100}%)`,
                  }}
                >
                  {images.map((m, idx) => (
                    <div
                      key={`${m.url}-${idx}`}
                      className="relative h-full min-w-full shrink-0 bg-gray-100"
                    >
                      {m.type === "video" ? (
                        <video
                          src={m.url}
                          className="absolute inset-0 h-full w-full object-contain object-center"
                          controls
                          playsInline
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={m.url}
                          alt={idx === 0 ? item.name : ""}
                          className="absolute inset-0 h-full w-full object-contain object-center cursor-zoom-in"
                          decoding="async"
                          onClick={() => {
                            setSelectedImageIndex(idx);
                            setImageZoomOpen(true);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {images.length > 1 && (
                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-3">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedImageIndex(idx);
                          pauseGalleryAuto();
                        }}
                        className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                          imageSlideIndex === idx
                            ? "w-5 bg-black"
                            : "w-1.5 bg-black/35"
                        }`}
                        aria-label={`View image ${idx + 1} of ${images.length}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="w-full max-w-full bg-gray-100 overflow-hidden rounded-none sm:rounded-lg lg:rounded-none">
                <div className="relative aspect-square w-full max-w-full overflow-hidden bg-gray-100 sm:aspect-square lg:max-h-[620px] lg:aspect-square">
                  {mainMedia?.type === "video" ? (
                    <video
                      key={mainMedia.url}
                      src={mainMedia.url}
                      className="absolute inset-0 h-full w-full object-contain object-center"
                      controls
                      playsInline
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={mainMedia?.url ?? productImage}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-contain object-center cursor-zoom-in"
                      decoding="async"
                      onClick={() => setImageZoomOpen(true)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Variant thumbnails: under carousel on phone, under main image on tablet/desktop */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide sm:mt-3 sm:gap-2 md:mt-4 md:gap-4 lg:mt-5 lg:flex-wrap lg:overflow-visible pb-1 lg:pb-0 min-w-0 max-w-full">
              {images.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-11 w-11 min-w-11 max-w-full shrink-0 overflow-hidden border-2 bg-gray-100 sm:h-14 sm:w-14 sm:min-w-14 md:h-20 md:w-20 md:min-w-20 lg:h-[100px] lg:w-[100px] lg:min-w-0 lg:max-h-[100px] lg:max-w-[110px] xl:h-[120px] xl:w-[120px] xl:max-h-[120px] xl:max-w-[128px] cursor-pointer ${imageSlideIndex === idx ? "border-black" : "border-transparent"}`}
                  aria-label={m.type === "video" ? "Play product video" : "View product image"}
                >
                  {m.type === "video" ? (
                    <>
                      <video
                        src={m.url}
                        className="absolute inset-0 h-full w-full object-contain object-center"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 sm:h-6 sm:w-6 lg:h-7 lg:w-7">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-2.5 w-2.5 fill-white sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5"
                            aria-hidden
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </>
                  ) : (
                    <img
                      src={m.url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain object-center"
                      decoding="async"
                    />
                  )}
                </button>
              ))}
            </div>

            {imageZoomOpen && (
              <ProductImageZoomLightbox
                images={images}
                initialIndex={imageSlideIndex}
                onClose={() => setImageZoomOpen(false)}
              />
            )}
          </div>

          {/* RIGHT SIDE - Details (compact 768–1024px) */}
          <div className="bg-gray-100 px-0 sm:px-4 md:px-4 lg:px-10 xl:px-10 font-inter min-w-0 flex flex-col">
            <div className="flex justify-between items-start gap-2 sm:gap-3 md:gap-3 lg:gap-4 relative">
              {" "}
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-medium font-inter uppercase  text-black sm:text-lg sm:tracking-[4px] md:text-lg md:tracking-[4px] lg:text-2xl lg:tracking-[5px] xl:text-2xl xl:tracking-[4px] wrap-break-word">
                  {item.name}
                </h1>
                <div className="mt-1 sm:mt-1.5 min-w-0">
                  <p
                    ref={shortDescRef}
                    className={`font-inter font-normal capitalize text-gray-500 wrap-break-word text-xs sm:text-sm md:text-sm lg:text-sm xl:text-lg ${
                      !shortDescExpanded ? "product-desc-clamp-short" : ""
                    }`}
                  >
                    {shortDescText}
                  </p>
                  {shortDescExceedsTwoLines && (
                    <button
                      type="button"
                      onClick={() => setShortDescExpanded((v) => !v)}
                      className="mt-1 flex min-h-11 w-full max-w-full touch-manipulation items-center text-left text-xs font-medium uppercase tracking-wide text-black underline decoration-black/40 underline-offset-2 active:bg-black/5 sm:mt-1.5 sm:min-h-0 sm:w-auto sm:text-sm sm:active:bg-transparent hover:decoration-black"
                    >
                      {shortDescExpanded ? "See less" : "See more"}
                    </button>
                  )}
                </div>
                <div className="mt-1.5 sm:mt-2 flex items-center justify-between flex-wrap gap-2">
                  {/* LEFT : PRICE */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item?.discountedPrice && (
                      <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-[22px] font-semibold text-[#e07a5f]">
                        ₹{Number(item.discountedPrice).toLocaleString("en-IN")}
                      </span>
                    )}

                    {item?.price && item?.discountedPrice && (
                      <span className="text-xs sm:text-sm md:text-base text-gray-500 line-through">
                        ₹{Number(item.price).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* RIGHT : RATING - only show when there is a rating > 0 */}
                  {shownAvgRating != null && (
                    <button
                      type="button"
                      onClick={handleOpenReviews}
                      className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white sm:px-2.5 sm:py-1 sm:text-xs md:text-xs lg:px-[14px] lg:py-[5px] lg:text-[14px] cursor-pointer"
                      aria-label="Open customer ratings and reviews"
                    >
                      ★ {shownAvgRating.toFixed(1)}
                    </button>
                  )}
                </div>

                {(bindOfferBadge || bindOfferHint) && (
                  <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                    {bindOfferBadge ? <BindOfferBadge text={bindOfferBadge} /> : null}
                    {bindOfferHint ? (
                      <p className="text-[11px] font-medium text-violet-800 sm:text-xs">
                        {bindOfferHint}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleWishlist}
                className="shrink-0 rounded p-1.5 sm:p-2 hover:bg-black/5 cursor-pointer touch-manipulation"
                aria-label={
                  inWishlist ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                {/* Same heart as ProductCard: outline when off, filled when in wishlist */}
                <svg
                  className={`h-5 w-5 sm:h-6 sm:w-6 md:h-6 md:w-6 lg:h-7 lg:w-7 ${inWishlist ? "text-black fill-black" : "text-gray-700"}`}
                  fill={inWishlist ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="shrink-0 rounded p-1.5 sm:p-2 hover:bg-black/5 cursor-pointer"
                aria-label="Share product"
              >
                <FaShareSquare className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900" />{" "}
                {copyMsg && (
                  <span className="absolute top-10 right-2 text-xs bg-black text-white px-2 py-1 rounded shadow">
                    {copyMsg}
                  </span>
                )}
              </button>
            </div>

            <div className="mt-3 sm:mt-4 md:mt-4 md:gap-3 lg:mt-6 lg:gap-4 flex flex-col sm:gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-3 lg:gap-5">
                {colors.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[11px] sm:text-xs md:text-xs lg:text-[15px] text-gray-700">
                      Color
                    </span>
                    <div className="flex gap-1.5 sm:gap-2 md:gap-2 lg:gap-[12px]">
                      {colors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c.id);
                            trackEvent({
                              eventType: "color_select",
                              itemId: itemIdStr,
                              meta: { color: c.name || c.id },
                            });
                          }}
                          className={`box-border flex h-5 min-h-5 max-h-5 w-5 min-w-5 max-w-5 shrink-0 items-center justify-center rounded-full border-2 p-0 sm:h-6 sm:min-h-6 sm:max-h-6 sm:w-6 sm:min-w-6 sm:max-w-6 md:h-5 md:min-h-5 md:max-h-5 md:w-5 md:min-w-5 md:max-w-5 lg:h-[26px] lg:min-h-[26px] lg:max-h-[26px] lg:w-[26px] lg:min-w-[26px] lg:max-w-[26px] cursor-pointer ${selectedColor === c.id ? "border-[#e53935]" : "border-gray-300"}`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-3">
                    {/* SIZE LABEL */}
                    <span className="text-[11px] sm:text-xs md:text-xs lg:text-[15px] text-gray-700">
                      Size
                    </span>

                    {/* SIZE OPTIONS */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2 lg:gap-[10px]">
                      {sizes.map((s) => (
                        <button
                          key={s.sku}
                          type="button"
                          onClick={() => {
                            if (!s.inStock) return;
                            setSelectedSize(s.size);
                            trackEvent({
                              eventType: "size_select",
                              itemId: itemIdStr,
                              sku: selectedSizeObj?.sku,
                              meta: { size: s.size, color: selectedColor },
                            });
                          }}
                          disabled={!s.inStock}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px]
        ${
          selectedSize === s.size
            ? "border-black bg-black text-white"
            : "border-gray-400 bg-white text-gray-700"
        }
        ${!s.inStock ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                        >
                          {s.size}
                        </button>
                      ))}
                    </div>

                    {/* SIZE CHART LINK */}
                    <button
                      onClick={() => setShowSizeChart(true)}
                      className="text-xs sm:text-sm underline underline-offset-2 text-black ml-2"
                    >
                      Size Chart
                    </button>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-left md:text-right w-full md:w-auto">
                {/* <div className="inline-block rounded-full bg-red-900 px-2 py-0.5 text-[10px] text-white sm:px-2.5 sm:py-1 sm:text-xs md:px-2.5 md:py-1 md:text-xs lg:px-[14px] lg:py-[5px] lg:text-[14px]">
                  ★{" "}
                  {item.avgRating != null
                    ? Number(item.avgRating).toFixed(1)
                    : "4.0"}
                </div> */}
                {/* <div className="mt-1 sm:mt-1.5 md:mt-1.5 lg:mt-2 text-[10px] text-gray-700 sm:text-[11px] md:text-xs lg:text-[14px]">
                  {deliveryOptions.length > 0 ? (
                    <select
                      className="border border-gray-300 bg-white py-1 px-2 text-inherit cursor-pointer max-w-full sm:max-w-[200px] md:max-w-[160px] w-full sm:w-auto text-xs sm:text-sm md:text-xs lg:text-sm uppercase"
                      defaultValue=""
                      aria-label="Delivery option"
                    >
                      <option value="" disabled>
                        Select delivery
                      </option>
                      {deliveryOptions.map((opt) => {
                        const id = opt._id?.toString?.() ?? opt._id;
                        const label =
                          opt.deliveryType === "90_MIN"
                            ? "90 MIN"
                            : opt.deliveryType === "ONE_DAY"
                              ? "1 DAY"
                              : opt.deliveryType || "Standard";
                        const charge =
                          opt.deliveryCharge != null
                            ? ` — Rs ${Number(opt.deliveryCharge)}`
                            : "";
                        return (
                          <option key={id} value={id}>
                            {label}
                            {charge}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    deliveryText
                  )}
                </div> */}
              </div>
            </div>

            <div className="mt-3 sm:mt-4 md:mt-4 lg:mt-[30px] border-b border-gray-300" />

            {/* DETAILS */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left sm:py-4 md:py-4 lg:py-6 xl:py-[28px] cursor-pointer touch-manipulation"
                onClick={() => toggleSection("details")}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium  uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] min-w-0 font-[Raleway]">
                  <RiFileList2Line className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">Details</span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-lg sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "details" ? (
                    <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  ) : (
                    <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  )}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows:
                    expandedSection === "details" && item.longDescription
                      ? "1fr"
                      : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-3 sm:pb-4 md:pb-3 pt-0 lg:pb-4">
                    <p
                      className={`text-xs sm:text-sm md:text-sm lg:text-base text-gray-700 wrap-break-word ${
                        longDescNeedsMore && !longDescExpanded
                          ? "product-desc-clamp-long whitespace-normal"
                          : "whitespace-pre-wrap"
                      }`}
                    >
                      {longDescText}
                    </p>
                    {longDescNeedsMore && (
                      <button
                        type="button"
                        onClick={() => setLongDescExpanded((v) => !v)}
                        className="mt-2 flex min-h-11 w-full max-w-full touch-manipulation items-center text-left text-xs font-medium uppercase tracking-wide text-black underline decoration-black/40 underline-offset-2 active:bg-black/5 sm:min-h-0 sm:w-auto sm:text-sm sm:active:bg-transparent hover:decoration-black"
                      >
                        {longDescExpanded ? "See less" : "See more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CARE */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left sm:py-4 md:py-4 lg:py-6 xl:py-[28px] cursor-pointer touch-manipulation"
                onClick={() => toggleSection("care")}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] min-w-0 font-[Raleway]">
                  <RiTShirtAirLine className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">Care</span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-[20px] sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "care" ? (
                    <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  ) : (
                    <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  )}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows: expandedSection === "care" ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="pt-0 pb-3">
                    {" "}
                    <div className="shrink-0 text-gray-500">
                      {/* <RiTruckLine
                        className="h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4 lg:h-6 lg:w-6"
                        aria-hidden
                      /> */}
                    </div>
                    <div className="min-w-0">
                      {/* <p className="text-xs sm:text-sm md:text-sm lg:text-base xl:text-[16px] text-gray-800">
                        {item.shipping?.title || "Free Flat Rate Shipping"}
                      </p> */}
                      {/* <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs md:text-xs lg:text-sm xl:text-[15px] text-gray-500">
                        {item.shipping?.estimatedDelivery ||
                          "Estimated delivery based on your pincode."}
                      </p> */}
                      {careBulletPoints.length > 0 && (
                        <ul
                          className="mt-2 list-disc space-y-1 pl-5 text-lg
                         text-gray-600"
                        >
                          {careBulletPoints.map((point, idx) => (
                            <li key={`${point.slice(0, 20)}-${idx}`}>
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* POLICY */}
{/* <div className="border-b border-gray-300">
  <button
    type="button"
    className="flex w-full items-center justify-between py-3 text-left sm:py-4 md:py-4 lg:py-6 xl:py-[28px]"
    onClick={() => toggleSection("policy")}
  >
    <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] font-[Raleway]">
      <RiTruckLine className="h-4 w-4 text-gray-500" />
      Policy
    </span>

    {expandedSection === "policy" ? (
      <FaChevronUp />
    ) : (
      <FaChevronDown />
    )}
  </button>

  <div
    className="grid transition-[grid-template-rows] duration-300 ease-out"
    style={{
      gridTemplateRows: expandedSection === "policy" ? "1fr" : "0fr",
    }}
  >
    <div className="overflow-hidden">
      <div className="pb-4 text-sm text-gray-600 space-y-3">

        {/* SHIPPING */}
        {/* {item?.shipping && (
          <div>
            <p className="font-medium text-black">Shipping</p>
            <p>{item.shipping?.title || "Standard shipping available"}</p>
            <p className="text-xs text-gray-500">
              {item.shipping?.estimatedDelivery}
            </p>
          </div>
        )} */}

        {/* COD */}
        {/* {item?.codPolicy?.text && (
          <div>
            <p className="font-medium text-black">Cash on Delivery</p>
            <p>{item.codPolicy.text}</p>
          </div>
        )} */}

        {/* RETURN */}
        {/* {item?.returnPolicy?.text && (
          <div>
            <p className="font-medium text-black">Returns</p>
            <p>{item.returnPolicy.text}</p>
          </div>
        )} */}

      {/* </div> */}
    {/* </div> */}
  {/* </div> */}
{/* </div> */} 

            {/* COD POLICY */}
            {/* <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left sm:py-4 md:py-4 lg:py-6 xl:py-[28px] cursor-pointer touch-manipulation"
                onClick={() => toggleSection("cod")}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] min-w-0 font-[Raleway]">
                  <FaTag className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">COD Policy </span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-lg sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "cod" ? (
                    <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  ) : (
                    <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  )}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows:
                    expandedSection === "cod" && item.codPolicy?.text
                      ? "1fr"
                      : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-3 sm:pb-4 md:pb-3 pt-0 lg:pb-4">
                    <p className="text-xs sm:text-sm md:text-sm lg:text-base text-gray-600 wrap-break-word">
                      {item.codPolicy?.text || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div> */}

            {/* RETURN POLICY */}
            {/* <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left sm:py-4 md:py-4 lg:py-6 xl:py-[28px] cursor-pointer touch-manipulation"
                onClick={() => toggleSection("return")}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] min-w-0 font-[Raleway]">
                  <RiRefreshLine className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">Return Policy</span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-lg sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "return" ? (
                    <FaChevronUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  ) : (
                    <FaChevronDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-5 md:w-5" />
                  )}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows:
                    expandedSection === "return" && item.returnPolicy?.text
                      ? "1fr"
                      : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-3 sm:pb-4 md:pb-3 pt-0 lg:pb-4">
                    <p className="text-xs sm:text-sm md:text-sm lg:text-base text-gray-600 wrap-break-word">
                      {item.returnPolicy?.text || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div> */}

            <div className="mt-4 sm:mt-6  md:mt-6 px-3 sm:px-4 md:px-4 lg:px-0 flex flex-col gap-2.5 sm:gap-3 md:gap-3 lg:mt-10 lg:gap-4 xl:mt-[50px] xl:gap-[25px]">
              {inCart || addedToCart ? (
                <>
                  <p className="h-10 w-full  flex items-center justify-center border border-black text-xs font-medium uppercase tracking-wider text-black sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px]">
                    Already in the cart
                  </p>
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3 md:gap-3 lg:gap-[25px]">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!productForCart || !selectedSizeObj?.inStock}
                      className="h-10 w-full sm:flex-1 bg-black text-xs font-medium uppercase tracking-wider text-white sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                    >
                      Buy It Now
                    </button>
                    <Link
                      to={ROUTES.CART}
                      className="h-10 w-full sm:flex-1 flex items-center justify-center border border-black text-xs font-medium uppercase tracking-wider text-black sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px] cursor-pointer touch-manipulation"
                    >
                      View Cart
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!productForCart || !selectedSizeObj?.inStock}
                    className="h-10 w-full bg-black text-xs font-medium uppercase tracking-wider text-white sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    Buy It Now
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!productForCart || !selectedSizeObj?.inStock}
                    className="h-10 w-full border border-black text-xs font-medium uppercase tracking-wider text-black cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px] touch-manipulation"
                  >
                    Add To Cart
                  </button>
                </>
              )}
              {cartError && (
                <p
                  className="mt-2 text-xs sm:text-sm text-red-600 wrap-break-word"
                  role="alert"
                >
                  {cartError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div ref={reviewsSectionRef} className="mt-6 sm:mt-8">
          <div className="flex flex-col gap-4 border-t border-gray-200 pt-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 max-w-xl">
              <p className="font-inter text-sm font-semibold text-gray-900">
                Customer feedback
              </p>
              <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                {isAuthenticated
                  ? "We value your feedback. Let us know what you loved, and help other shoppers make confident choices."
                  : "We value your feedback. Let us know what you loved, and help other shoppers make confident choices"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenWriteReview}
              className="shrink-0 rounded-full border-2 border-black bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gray-900 active:scale-[0.98] touch-manipulation"
            >
              Write a review
            </button>
          </div>
          <ReviewRating
            itemId={item._id}
            refreshKey={reviewsRefreshKey}
            avgRating={shownAvgRating}
            onSummaryChange={handleReviewSummaryChange}
          />
        </div>

        <RelatedProducts itemId={item._id} limit={10} />
        <JustForYouProducts />

        <WriteReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          itemId={item._id}
          productName={item.name}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUserId}
          onSubmitted={() => setReviewsRefreshKey((k) => k + 1)}
        />

        {/* 🔥 SIZE CHART SLIDER */}
        <div
          className={`fixed inset-0 z-50 ${
            showSizeChart ? "visible" : "invisible"
          }`}
        >
          {/* BACKDROP */}
          <div
            onClick={() => setShowSizeChart(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              showSizeChart ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* RIGHT SLIDER */}
          <div
            className={`absolute right-0 top-0 h-full w-[94%] sm:w-[min(720px,94vw)] lg:w-[min(820px,95vw)] xl:w-[min(920px,96vw)] bg-white shadow-xl transform transition-transform duration-300 ${
              showSizeChart ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* HEADER — main title is inside SizeChart */}
            <div className="flex justify-end items-center px-3 py-2 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setShowSizeChart(false)}
                className="flex h-10 w-10 items-center justify-center text-xl font-bold text-black hover:bg-neutral-100"
                aria-label="Close size chart"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-52px)] p-4 sm:p-5">
              <SizeChart item={item} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
