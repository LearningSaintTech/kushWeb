import { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { debugLog, debugError } from '../../utils/debugLog.js';
import { isLoggingEnabled } from "../../utils/logLevel.js";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { FiChevronDown, FiChevronUp, FiChevronRight, FiClock } from "react-icons/fi";
import { FaTag } from "react-icons/fa6";
import { RiFileList2Line, RiRefreshLine, RiTruckLine } from "react-icons/ri";
import { FaHandHoldingHeart } from "react-icons/fa";
import { itemsService } from "../../services/items.service.js"
import { deliveryService } from "../../services/delivery.service.js";
import { policyService } from "../../services/policy.service.js";
import { useAuth } from "../../app/context/AuthContext";
import { useCartWishlist } from "../../app/context/CartWishlistContext";
import { ROUTES, getProductShareUrl } from "../../utils/constants";
import { getPublicSiteOrigin } from "../../services/config.js";
import productImage from "../../assets/temporary/productimage.png";
import ReviewRating from "./components/ReviewRating";
import WriteReviewModal from "./components/WriteReviewModal";
import RelatedProducts from "./components/RelatedProducts";
import PairItWithProducts from "./components/PairItWithProducts";
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
import { parseProductDescription } from "../../utils/productDescription.js";
import {
  formatLaunchDate,
  isItemComingSoon,
} from "../../utils/productLaunch.js";
import {
  getSizeAvailableQty,
  isSizeInStock,
  withAvailableBySku,
} from "../../utils/productStock.js";

function splitReturnPolicyBullets(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const DEFAULT_RETURN_POLICY_DESCRIPTION =
  "Returns must be raised within 7 days of delivery. Items must be unused, unwashed, undamaged, and have their original tags attached. Once the returned product is received, it will undergo a quality check by Khush personnel. The return will be approved only if the product satisfies all return eligibility and quality-check requirements. After successful quality-check approval, the refund amount will be credited within 7 days through the applicable payment or refund method.";

const isDev = Boolean(import.meta.env?.DEV || isLoggingEnabled());

const devLog = {
  api: (action, data) => {
    if (!isDev) return;
    console.groupCollapsed(
      `%c[ProductDetails:API] ${action}`,
      "color: #7c3aed; font-weight: bold; background: #ede9fe; padding: 2px 6px; border-radius: 4px;"
    );
    console.log("Endpoint & Payload Details:", data);
    console.groupEnd();
  },
  variants: (title, data) => {
    if (!isDev) return;
    console.groupCollapsed(
      `%c[ProductDetails:Variants] ${title}`,
      "color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;"
    );
    if (data?.table) {
      console.table(data.table);
    }
    console.log("Variant & Stock Overview:", data);
    console.groupEnd();
  },
  click: (interaction, details) => {
    if (!isDev) return;
    console.log(
      `%c[ProductDetails:Click] ${interaction}`,
      "color: #059669; font-weight: bold; background: #d1fae5; padding: 2px 6px; border-radius: 4px;",
      details
    );
  },
  cart: (step, details) => {
    if (!isDev) return;
    console.group(
      `%c[ProductDetails:AddToCart] ${step}`,
      "color: #ea580c; font-weight: bold; background: #ffedd5; padding: 2px 6px; border-radius: 4px;"
    );
    console.log("Cart Lifecycle Details:", details);
    console.groupEnd();
  },
  stockWarning: (msg, details) => {
    if (!isDev) return;
    console.warn(
      `%c[ProductDetails:Out-Of-Stock] ${msg}`,
      "color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;",
      details
    );
  },
};

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
  const [reviewCount, setReviewCount] = useState(null);
  const [quantity, setQuantity] = useState(1);
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
  const [returnPolicyDescription, setReturnPolicyDescription] = useState("");

  /** Chars above this show See more for long description */
  const LONG_DESC_COLLAPSE_THRESHOLD = 260;

  // Active return policy description for PDP accordion
  useEffect(() => {
    let cancelled = false;
    policyService
      .getActiveReturn()
      .then((res) => {
        const payload = res?.data?.data ?? res?.data;
        const description =
          typeof payload?.description === "string"
            ? payload.description.trim()
            : "";
        if (!cancelled) setReturnPolicyDescription(description);
      })
      .catch(() => {
        if (!cancelled) setReturnPolicyDescription("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch delivery options by pincode for dropdown
  useEffect(() => {
    if (!pincode || !String(pincode).trim()) {
      setDeliveryOptionsFromPincode([]);
      return;
    }
    const pin = String(pincode).trim();
    devLog.api("Request: Check Delivery by Pincode", {
      method: "GET",
      endpoint: `/delivery/check/${pin}`,
      pincode: pin,
    });
    deliveryService
      .checkByPincode(pin)
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const options = data?.deliveryOptions ?? [];
        devLog.api("Response: Delivery Options Received", {
          pincode: pin,
          deliveryOptions: options,
        });
        setDeliveryOptionsFromPincode(Array.isArray(options) ? options : []);
      })
      .catch((err) => {
        devLog.api("Error: Check Delivery Failed", {
          pincode: pin,
          error: err?.message,
        });
        setDeliveryOptionsFromPincode([]);
      });
  }, [pincode]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid product");
      return;
    }
    setLoading(true);
    setError(null);
    setExpandedSection("details");
    setSelectedImageIndex(0);
    setShortDescExpanded(false);
    setLongDescExpanded(false);
    setShowSizeChart(false);
    setImageZoomOpen(false);
    const params = pincode ? { pincode: String(pincode) } : {};
    devLog.api("Request: Fetch Product Details By ID", {
      method: "GET",
      endpoint: `/items/single/${id}`,
      params,
      pincode: pincode ?? "None provided",
      itemId: id,
    });
    itemsService
      .getById(id, params)
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        // availableQuantity is the source of truth; fill each size from availableBySku.
        const item = withAvailableBySku(data?.item ?? data, data?.availableBySku);

        devLog.api("Response: Product Details Received", {
          statusCode: res?.status,
          hasItem: !!item,
          itemId: item?._id,
          name: item?.name,
          price: item?.price,
          discountedPrice: item?.discountedPrice,
          variantsCount: item?.variants?.length ?? 0,
          deliveriesCount: (data?.deliveries ?? []).length,
          rawData: data,
        });

        if (item?.variants?.length) {
          const stockTable = [];
          let inStockCount = 0;
          let outOfStockCount = 0;
          let totalStock = 0;

          item.variants.forEach((v, vIdx) => {
            (v.sizes || []).forEach((s) => {
              const qty = getSizeAvailableQty(s) ?? 0;
              const inStock = isSizeInStock(s);
              if (inStock) inStockCount++;
              else outOfStockCount++;
              totalStock += qty;

              stockTable.push({
                VariantIndex: vIdx,
                Color: v.color?.name || "Default",
                Size: s.size,
                SKU: s.sku || "N/A",
                StockQty: qty,
                Status: inStock ? "✅ In Stock" : "❌ OUT OF STOCK",
              });
            });
          });

          devLog.variants("Product Variants & Stock Inventory Breakdown", {
            itemId: item._id,
            productName: item.name,
            totalVariants: item.variants.length,
            totalSizeCombinations: stockTable.length,
            inStockCount,
            outOfStockCount,
            totalAvailableStock: totalStock,
            table: stockTable,
          });
        } else {
          devLog.stockWarning("No variants found for this product in API response", { item });
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
        {
          const total = Number(item?.totalReviews ?? item?.reviewCount);
          setReviewCount(Number.isFinite(total) && total > 0 ? total : null);
        }
        setExpandedSection("details");
        setSelectedImageIndex(0);
        setShortDescExpanded(false);
        setLongDescExpanded(false);
        // Auto-select first available color and size so Buy Now / Add to Cart are enabled on first visit
        if (item?.variants?.length) {
          let firstAvailableColor = null;
          let firstAvailableSize = null;
          for (const v of item.variants) {
            const firstInStock = v.sizes?.find(isSizeInStock);
            if (firstInStock) {
              firstAvailableColor = v.color?.name ?? null;
              firstAvailableSize = firstInStock.size;
              break;
            }
          }
          const chosenColor = firstAvailableColor ?? item.variants[0]?.color?.name ?? null;
          const chosenSize = firstAvailableSize ?? item.variants[0]?.sizes?.[0]?.size ?? null;

          devLog.variants("Initial Variant Auto-Selected", {
            selectedColor: chosenColor,
            selectedSize: chosenSize,
            selectionReason: firstAvailableColor
              ? "Auto-selected first IN-STOCK variant & size"
              : "Fallback: Selected first variant because all variants are out of stock",
          });

          setSelectedColor(chosenColor);
          setSelectedSize(chosenSize);
        } else {
          setSelectedColor(null);
          setSelectedSize(null);
        }
      })
      .catch((err) => {
        devLog.api("Error: Failed to load product", {
          error: err?.response?.data || err?.message,
          status: err?.response?.status,
          itemId: id,
        });
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
    const total = Number(summary?.totalReviews);
    setReviewCount(Number.isFinite(total) && total > 0 ? total : null);
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
    return item.variants.map((v) => {
      const firstImage = [...(v.images || [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .find((m) => m?.url && getMediaTypeFromEntry(m) === "image");
      return {
        id: v.color?.name,
        name: v.color?.name,
        value: v.color?.hex || "#666",
        thumbnail: firstImage?.url ?? null,
      };
    });
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
    // availableQuantity decides stock; stale size.stock is never shown as a count.
    return selectedVariant.sizes.map((s) => ({
      size: s.size,
      sku: s.sku,
      inStock: isSizeInStock(s),
      qty: getSizeAvailableQty(s),
    }));
  }, [selectedVariant]);

  const productOutOfStock = useMemo(() => {
    const allSizes = (item?.variants || []).flatMap((v) => v.sizes || []);
    if (!allSizes.length) return false;
    return !allSizes.some(isSizeInStock);
  }, [item?.variants]);

  const oosImageRibbon = productOutOfStock ? (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 bg-black/80 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white sm:text-base">
      Out of stock
    </div>
  ) : null;

  // When color changes, if current size is unavailable in new variant, select first available size
  useEffect(() => {
    if (!sizes.length) return;
    const currentInList = sizes.find(
      (s) => String(s.size).trim() === String(selectedSize).trim(),
    );
    const currentAvailable = currentInList?.inStock;
    if (!currentInList || !currentAvailable) {
      const firstAvailable = sizes.find((s) => s.inStock);
      const newSize = firstAvailable ? firstAvailable.size : sizes[0].size;
      devLog.variants("Color change updated available sizes", {
        previousSize: selectedSize,
        newSelectedSize: newSize,
        availableSizesForThisColor: sizes.filter((s) => s.inStock).map((s) => s.size),
        outOfStockSizesForThisColor: sizes.filter((s) => !s.inStock).map((s) => s.size),
      });
      setSelectedSize(newSize);
    }
  }, [sizes, selectedSize]);

  const imageSlideIndex = Math.min(
    selectedImageIndex,
    Math.max(0, images.length - 1),
  );

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

  /** "N left" shows only when stock is below this */
  const LOW_STOCK_THRESHOLD = 10;
  const MAX_QUANTITY = 10;
  const maxQuantity =
    selectedSizeObj?.qty != null
      ? Math.max(1, Math.min(MAX_QUANTITY, selectedSizeObj.qty))
      : MAX_QUANTITY;

  // Reset quantity when product / color / size changes
  useEffect(() => {
    setQuantity(1);
  }, [id, selectedColor, selectedSize]);

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
      quantity: Math.min(quantity, maxQuantity),
    };
  }, [
    item,
    quantity,
    maxQuantity,
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

  useEffect(() => {
    if (!item?._id) return;
    console.log("[ProductPage] RelatedProducts will receive itemId", {
      itemId: item._id,
      itemName: item.name,
    });
  }, [item?._id, item?.name]);

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
    devLog.cart("1. Add To Cart Button Clicked", {
      userStatus: isAuthenticated ? "Logged In User" : "Guest User",
      userId: user?._id || user?.id || null,
      pincode: pincode || "None provided",
      selectedColor,
      selectedSize,
      selectedSizeObj: selectedSizeObj
        ? {
          size: selectedSizeObj.size,
          sku: selectedSizeObj.sku,
          inStock: selectedSizeObj.inStock,
        }
        : null,
      isVariantInStock: !!selectedSizeObj?.inStock,
      productForCart,
      staticFieldsCheck: {
        isStaticImageFallback: !firstImageUrl || firstImageUrl === productImage,
        isStaticRatingFallback: item?.avgRating == null,
        isStaticDeliveryFallback: !deliveryOptionsFromPincode.length && !deliveries.length,
      },
    });

    if (!productForCart || !selectedSizeObj?.inStock) {
      devLog.stockWarning("Add To Cart BLOCKED: Item is out of stock or incomplete", {
        hasProductForCart: !!productForCart,
        selectedSizeObj,
        reason: !productForCart
          ? "productForCart is null (check item, variant, or size selection)"
          : "selectedSizeObj.inStock is false (This variant size is out of stock)",
      });
      return;
    }

    devLog.cart("2. Executing addToCart via Context", {
      authMode: isAuthenticated
        ? "Authenticated: Will call backend API POST /cart/add"
        : "Guest: Will save to localStorage guest cart",
      payloadSentToCart: {
        id: productForCart.id,
        sku: productForCart.sku,
        variant: productForCart.variant,
        pincode: pincode ?? null,
      },
    });

    const result = await addToCart(productForCart, pincode);

    devLog.cart("3. Add To Cart Result Received", {
      result,
      success: result?.success !== false,
      message: result?.message || (result?.success !== false ? "Successfully added to cart" : "Failed"),
    });

    if (result?.success === false && result?.message) {
      setCartError(result.message);
      return;
    }

    devLog.cart("4. Firing Pixels & Analytics for AddToCart", {
      trackPixelAddToCart: {
        id: productForCart.id,
        name: productForCart.title,
        price: productForCart.price,
        sku: productForCart.sku,
      },
      trackEvent: {
        eventType: "add_to_cart",
        itemId: productForCart.id,
        sku: productForCart.sku,
      },
    });

    trackPixelAddToCart({
      id: productForCart.id,
      name: productForCart.title,
      price: productForCart.price,
      quantity: productForCart.quantity,
      sku: productForCart.sku,
    });

    trackEvent({
      eventType: "add_to_cart",
      itemId: productForCart?.id ? String(productForCart.id) : undefined,
      sku: productForCart?.sku ? String(productForCart.sku) : undefined,
      quantity: productForCart.quantity,
      price: Number(productForCart.price?.replace(/[^\d.]/g, "")) || 0,
      currency: "INR",
    });

    setAddedToCart(true);
  };

  const handleWishlist = () => {
    if (!item) return;
    const imageUrl = firstImageUrl || "";
    const hoverUrl = hoverImageUrl || imageUrl;
    devLog.click("Wishlist button clicked", {
      action: inWishlist ? "Remove from wishlist" : "Add to wishlist",
      itemId: itemIdStr ?? item._id,
      title: item.name,
      price: priceDisplay,
      currentlyInWishlist: inWishlist,
    });
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
    const origin = getPublicSiteOrigin() || window.location.origin;
    const url = getProductShareUrl(origin, item._id, item.name);
    devLog.click("Share button clicked", {
      url,
      itemId: item._id,
      title: item.name,
    });
    try {
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
      quantity: productForCart.quantity,
      sku: productForCart.sku,
      skipDedupe: true,
    });
  };

  const handleBuyNow = async () => {
    devLog.cart("Buy It Now Button Clicked", {
      selectedColor,
      selectedSize,
      selectedSizeObj,
      isVariantInStock: !!selectedSizeObj?.inStock,
      alreadyInCart: inCart,
      productForCart,
    });

    if (!productForCart || !selectedSizeObj?.inStock) {
      devLog.stockWarning("Buy It Now BLOCKED: Out of stock or incomplete selection", {
        hasProductForCart: !!productForCart,
        selectedSizeObj,
      });
      return;
    }
    setCartError(null);
    /** Same SKU already in cart — go to cart without calling add again */
    if (!inCart) {
      devLog.cart("Buy It Now: Item not in cart yet, adding to cart...", {
        sku: productForCart.sku,
      });
      const result = await addToCart(productForCart, pincode);
      if (result?.success === false && result?.message) {
        devLog.cart("Buy It Now: addToCart failed", { message: result.message });
        setCartError(result.message);
        setTimeout(() => setCartError(null), 4000);
        return;
      }
    } else {
      devLog.cart("Buy It Now: Item already in cart, redirecting directly to cart...", {
        sku: productForCart.sku,
      });
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
    const nextState = expandedSection === key ? null : key;
    devLog.click("Accordion section toggled", {
      section: key,
      action: nextState === key ? "expanded" : "collapsed",
    });
    setExpandedSection(nextState);
  };

  const handleOpenReviews = () => {
    devLog.click("Ratings / Reviews link clicked - Scrolling to reviews", {
      avgRating: shownAvgRating,
    });
    reviewsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const currentUserId = user?._id ?? user?.id ?? null;

  const handleOpenWriteReview = () => {
    devLog.click("Write a Review modal opened", {
      itemId: item?._id,
      productName: item?.name,
      isAuthenticated,
      currentUserId,
    });
    setReviewModalOpen(true);
  };

  const shortDescText = (item?.shortDescription ?? "").trim();
  const longDescText = (item?.longDescription ?? "").trim();
  const longDescNeedsMore = longDescText.length > LONG_DESC_COLLAPSE_THRESHOLD;
  const longDescBlocks = useMemo(() => parseProductDescription(longDescText), [longDescText]);

  const careBulletPoints = useMemo(() => {
    const raw = item?.care?.description ?? "";
    const withBreaks = String(raw)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|div)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/[•●▪◦]/g, "\n")
      .replace(/\r/g, "")
      .replace(/(?=(?:Wash|Dry|Iron|Avoid|Bleach)\s*:)/gi, "\n");
    return withBreaks
      .split(/\n+/)
      .map((x) => x.replace(/^[\-\s•]+|[\s]+$/g, "").replace(/\s+/g, " ").trim())
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

  const shareOrigin = getPublicSiteOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = getProductShareUrl(shareOrigin, item._id, item.name);

  return (
    <div className="mt-8 min-h-dvh bg-gray-100 pt-24 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] font-inter sm:mt-0 sm:pt-24 sm:pb-[max(3rem,env(safe-area-inset-bottom,0px))] md:pb-[max(3.5rem,env(safe-area-inset-bottom,0px))] lg:pt-24 lg:pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
      <Helmet>
        <title>{`${item.name || "Product"} | Khush`}</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content={item.name || "Khush"} />
        <meta property="og:description" content={item.shortDescription || item.name || "Khush"} />
        <meta property="og:url" content={shareUrl} />
        {firstImageUrl ? <meta property="og:image" content={firstImageUrl} /> : null}
      </Helmet>
      <div className="px-4 sm:px-6 md:px-8 lg:px-[6vw]">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start md:gap-8 xl:gap-12">
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
                            devLog.click("Mobile carousel image clicked - Opening zoom lightbox", {
                              imageIndex: idx,
                              url: m.url,
                            });
                            setSelectedImageIndex(idx);
                            setImageZoomOpen(true);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {oosImageRibbon}
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
                        className={`pointer-events-auto h-1.5 rounded-full transition-all ${imageSlideIndex === idx
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

            {/* Tablet/desktop: editorial gallery — hero image, then a 2-column grid of the rest */}
            <div className="hidden sm:grid grid-cols-2 gap-2 md:gap-3">
              {images.map((m, idx) => (
                <div
                  key={`${m.url}-${idx}`}
                  className={`relative overflow-hidden bg-gray-200 ${idx === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[4/5]"}`}
                >
                  {m.type === "video" ? (
                    <video
                      src={m.url}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                      controls
                      playsInline
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt={idx === 0 ? item.name : ""}
                      className="absolute inset-0 h-full w-full object-cover object-top cursor-zoom-in transition-transform duration-500 hover:scale-[1.02]"
                      loading={idx < 3 ? "eager" : "lazy"}
                      decoding="async"
                      onClick={() => {
                        devLog.click("Gallery image clicked - Opening zoom lightbox", {
                          imageIndex: idx,
                          url: m.url,
                        });
                        setSelectedImageIndex(idx);
                        setImageZoomOpen(true);
                      }}
                    />
                  )}
                  {idx === 0 ? oosImageRibbon : null}
                </div>
              ))}
            </div>

            {/* Phone only: thumbnails under the carousel */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 min-w-0 max-w-full sm:hidden">
              {images.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    devLog.click("Gallery thumbnail clicked", {
                      imageIndex: idx,
                      mediaType: m.type,
                      url: m.url,
                      totalImages: images.length,
                    });
                    setSelectedImageIndex(idx);
                  }}
                  className={`relative h-11 w-11 min-w-11 max-w-full shrink-0 overflow-hidden border-2 bg-gray-100 cursor-pointer ${imageSlideIndex === idx ? "border-black" : "border-transparent"}`}
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
          <div className="bg-gray-100 px-0 font-inter min-w-0 flex flex-col md:sticky md:top-24">
            <div className="flex justify-between items-start gap-2 sm:gap-3 md:gap-3 lg:gap-4 relative">
              {" "}
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-medium font-inter uppercase  text-black sm:text-lg sm:tracking-[4px] md:text-lg md:tracking-[4px] lg:text-2xl lg:tracking-[5px] xl:text-2xl xl:tracking-[4px] wrap-break-word">
                  {item.name}
                </h1>
                {productOutOfStock ? (
                  <div
                    role="status"
                    className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 sm:text-sm"
                  >
                    Out of stock — this product is currently unavailable
                  </div>
                ) : selectedSizeObj && !selectedSizeObj.inStock ? (
                  <div
                    role="status"
                    className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium uppercase tracking-wider text-amber-800 sm:text-sm"
                  >
                    Selected size is out of stock
                  </div>
                ) : null}
                <div className="mt-1 sm:mt-1.5 min-w-0">
                  <p
                    ref={shortDescRef}
                    className={`font-inter font-normal capitalize text-gray-500 wrap-break-word text-xs sm:text-sm md:text-sm lg:text-sm xl:text-lg ${!shortDescExpanded ? "product-desc-clamp-short" : ""
                      }`}
                  >
                    {shortDescText}
                  </p>
                  {shortDescExceedsTwoLines && (
                    <button
                      type="button"
                      onClick={() => {
                        devLog.click("Short description toggle clicked", {
                          willExpand: !shortDescExpanded,
                        });
                        setShortDescExpanded((v) => !v);
                      }}
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
                      onClick={() => {
                        devLog.click("Rating badge clicked - Scrolling to reviews", {
                          avgRating: shownAvgRating,
                        });
                        handleOpenReviews();
                      }}
                      className="flex items-center gap-1.5 cursor-pointer"
                      aria-label={`Rated ${shownAvgRating.toFixed(1)} out of 5. Open customer ratings and reviews`}
                    >
                      <span className="flex items-center gap-0.5 text-[#f5a623]">
                        {[1, 2, 3, 4, 5].map((n) =>
                          shownAvgRating >= n ? (
                            <FaStar key={n} className="h-3.5 w-3.5" />
                          ) : shownAvgRating >= n - 0.5 ? (
                            <FaStarHalfAlt key={n} className="h-3.5 w-3.5" />
                          ) : (
                            <FaRegStar key={n} className="h-3.5 w-3.5" />
                          ),
                        )}
                      </span>
                      {reviewCount != null && (
                        <span className="text-xs text-gray-500">({reviewCount})</span>
                      )}
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

            {/* COLOR — variant image swatches + delivery promise */}
            {colors.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-700 sm:text-xs">
                    Color
                    {selectedColor ? (
                      <span className="ml-1 font-normal capitalize text-gray-500">
                        : {selectedColor}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {colors.map((c) => {
                      const isSelected = selectedColor === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const targetVariant = item?.variants?.find((v) => v.color?.name === c.id);
                            const sizesInfo = (targetVariant?.sizes || []).map((s) => ({
                              size: s.size,
                              sku: s.sku,
                              inStock: isSizeInStock(s),
                              qty: getSizeAvailableQty(s),
                            }));
                            devLog.click("Color Selected", {
                              clickedColor: c.name || c.id,
                              hex: c.value,
                              availableSizesForColor: sizesInfo,
                              inStockSizes: sizesInfo.filter((s) => s.inStock).map((s) => s.size),
                              outOfStockSizes: sizesInfo.filter((s) => !s.inStock).map((s) => s.size),
                              imagesCount: targetVariant?.images?.length || 0,
                            });
                            setSelectedColor(c.id);
                            trackEvent({
                              eventType: "color_select",
                              itemId: itemIdStr,
                              meta: { color: c.name || c.id },
                            });
                          }}
                          className={`relative h-[76px] w-[58px] shrink-0 overflow-hidden rounded-md border bg-gray-200 p-0 transition sm:h-[88px] sm:w-[68px] cursor-pointer ${isSelected
                            ? "border-[#e07a5f] ring-1 ring-[#e07a5f] ring-offset-1"
                            : "border-gray-300 hover:border-gray-500"
                            }`}
                          aria-label={c.name}
                          aria-pressed={isSelected}
                          title={c.name}
                        >
                          {c.thumbnail ? (
                            <img
                              src={c.thumbnail}
                              alt=""
                              className="h-full w-full object-cover object-top"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span
                              className="block h-full w-full"
                              style={{ backgroundColor: c.value }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* {deliveryOptions.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-black sm:text-[11px]">
                      <FiClock className="h-3.5 w-3.5" aria-hidden />
                      Get in {deliveryText}
                    </span>
                  )} */}
                </div>
              </div>
            )}

            {/* SIZE — boxes with per-size stock */}
            {sizes.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-700 sm:text-xs">
                    Size{selectedSize ? `: ${selectedSize}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      devLog.click("Size Chart link clicked", {
                        itemId: item?._id,
                        itemName: item?.name,
                      });
                      setShowSizeChart(true);
                    }}
                    className="flex items-center gap-0.5 text-[11px] text-black hover:underline sm:text-xs cursor-pointer"
                  >
                    Size Chart <FiChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const isSelected = selectedSize === s.size;
                    const stockLabel = !s.inStock
                      ? "Sold out"
                      : s.qty != null && s.qty < LOW_STOCK_THRESHOLD
                        ? `${s.qty} left`
                        : null;
                    return (
                      <button
                        key={s.sku}
                        type="button"
                        onClick={() => {
                          if (!s.inStock) {
                            devLog.stockWarning("Clicked Size is OUT OF STOCK", {
                              size: s.size,
                              sku: s.sku,
                              color: selectedColor,
                              inStock: false,
                              message: "Selection ignored because variant size is out of stock",
                            });
                            return;
                          }
                          devLog.click("Size Selected", {
                            selectedSize: s.size,
                            sku: s.sku,
                            color: selectedColor,
                            inStock: true,
                          });
                          setSelectedSize(s.size);
                          trackEvent({
                            eventType: "size_select",
                            itemId: itemIdStr,
                            sku: selectedSizeObj?.sku,
                            meta: { size: s.size, color: selectedColor },
                          });
                        }}
                        disabled={!s.inStock}
                        aria-pressed={isSelected}
                        className={`flex h-10 min-w-10 flex-col items-center justify-center gap-0.5 rounded-md border-2 px-2 transition sm:h-11 sm:min-w-11 ${isSelected
                          ? "border-[#e07a5f] bg-[#111] text-white"
                          : "border-gray-200 bg-white text-black hover:border-gray-400"
                          } ${!s.inStock ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      >
                        <span className={`text-xs font-semibold uppercase leading-none sm:text-[13px] ${!s.inStock ? "line-through" : ""}`}>
                          {s.size}
                        </span>
                        {stockLabel && (
                          <span
                            className={`text-[8px] leading-none sm:text-[9px] ${!s.inStock ? "text-gray-400" : "text-[#f59e0b]"}`}
                          >
                            {stockLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUANTITY + BUY / ADD TO CART — one row (Add to Cart wraps below on phones) */}
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7">
              {(inCart || addedToCart) && (
                <p className="text-center text-[11px] font-medium uppercase tracking-wider text-gray-600 sm:text-left sm:text-xs">
                  Already in the cart
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:gap-3">
                {!productOutOfStock && (
                  <div className="flex h-11 shrink-0 items-center overflow-hidden rounded-md border border-gray-400 bg-white sm:h-12">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="flex h-full w-7 items-center justify-center text-base text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 sm:w-8 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span
                      className="flex h-full min-w-6 items-center justify-center text-sm font-semibold"
                      aria-live="polite"
                      aria-label={`Quantity ${Math.min(quantity, maxQuantity)}`}
                    >
                      {Math.min(quantity, maxQuantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      disabled={quantity >= maxQuantity}
                      className="flex h-full w-7 items-center justify-center text-base text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 sm:w-8 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!productForCart || !selectedSizeObj?.inStock}
                  className="h-11 min-w-0 flex-1 rounded-md bg-black px-2 text-xs font-medium uppercase tracking-wider text-white sm:h-12 sm:text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                >
                  {productOutOfStock ? "Out of Stock" : "Buy It Now"}
                </button>
                {inCart || addedToCart ? (
                  <Link
                    to={ROUTES.CART}
                    className="flex h-11 min-w-0 basis-full items-center justify-center rounded-md border border-black bg-white px-2 text-xs font-medium uppercase tracking-wider text-black sm:h-12 sm:basis-0 sm:flex-1 sm:text-sm touch-manipulation"
                  >
                    View Cart
                  </Link>
                ) : !productOutOfStock ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!productForCart || !selectedSizeObj?.inStock}
                    className="h-11 min-w-0 basis-full rounded-md border border-gray-400 bg-white px-2 text-xs font-medium uppercase tracking-wider text-black sm:h-12 sm:basis-0 sm:flex-1 sm:text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                  >
                    Add To Cart
                  </button>
                ) : null}
              </div>
              {cartError && (
                <p
                  className="text-xs sm:text-sm text-red-600 wrap-break-word"
                  role="alert"
                >
                  {cartError}
                </p>
              )}
            </div>

            <div className="mt-6 border-b border-gray-300 sm:mt-8" />
            {/* DETAILS / CARE / RETURN — shared mobile + desktop type scale */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left sm:py-4 cursor-pointer touch-manipulation"
                onClick={() => toggleSection("details")}
              >
                <span className="flex min-w-0 items-center gap-1.5 font-[Raleway] text-xs font-medium uppercase tracking-[0.18em] sm:gap-2 sm:text-[13px]">
                  <RiFileList2Line className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="truncate">Details</span>
                </span>
                <span className="inline-flex shrink-0 text-lg text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "details" ? (
                    <FiChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <FiChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  <div className="px-0 pb-3 pt-0 sm:pb-4 md:pb-3 lg:pb-4">
                    <div
                      className={`font-inter font-normal wrap-break-word text-xs leading-relaxed text-gray-700 sm:text-sm md:text-sm lg:text-base ${longDescNeedsMore && !longDescExpanded
                        ? "max-h-[9.5em] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
                        : ""
                        }`}
                    >
                      {longDescBlocks.map((block, i) =>
                        block.type === "heading" ? (
                          <h3
                            key={i}
                            className={`font-semibold text-gray-900 text-[0.95em] ${i === 0 ? "mt-0" : "mt-4"} mb-1`}
                          >
                            {block.text}
                          </h3>
                        ) : block.type === "field" ? (
                          <p key={i} className="mt-1">
                            <span className="font-semibold text-gray-900">{block.label}:</span>{" "}
                            {block.value}
                          </p>
                        ) : (
                          <p key={i} className={i === 0 ? "mt-0" : "mt-2"}>
                            {block.text}
                          </p>
                        )
                      )}
                    </div>
                    {longDescNeedsMore && (
                      <button
                        type="button"
                        onClick={() => {
                          devLog.click("Long description toggle clicked", {
                            willExpand: !longDescExpanded,
                          });
                          setLongDescExpanded((v) => !v);
                        }}
                        className="mt-2 flex min-h-11 w-full max-w-full touch-manipulation items-center text-left text-xs font-medium uppercase tracking-wide text-black underline decoration-black/40 underline-offset-2 active:bg-black/5 sm:min-h-0 sm:w-auto sm:text-sm sm:active:bg-transparent hover:decoration-black"
                      >
                        {longDescExpanded ? "See less" : "See more"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SHIPPING */}
            {(item?.shipping?.title || item?.shipping?.estimatedDelivery) && (
              <div className="border-b border-gray-300">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3.5 text-left sm:py-4 cursor-pointer touch-manipulation"
                  onClick={() => toggleSection("shipping")}
                >
                  <span className="flex min-w-0 items-center gap-1.5 font-[Raleway] text-xs font-medium uppercase tracking-[0.18em] sm:gap-2 sm:text-[13px]">
                    <RiTruckLine className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4" />
                    <span className="truncate">{item.shipping.title || "Shipping"}</span>
                  </span>
                  <span className="inline-flex shrink-0 text-gray-500">
                    {expandedSection === "shipping" ? (
                      <FiChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <FiChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{
                    gridTemplateRows: expandedSection === "shipping" ? "1fr" : "0fr",
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-3 text-xs text-gray-600 sm:pb-4 sm:text-sm">
                      {item.shipping.estimatedDelivery || item.shipping.title}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CARE */}
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left sm:py-4 cursor-pointer touch-manipulation"
                onClick={() => toggleSection("care")}
              >
                <span className="flex min-w-0 items-center gap-1.5 font-[Raleway] text-xs font-medium uppercase tracking-[0.18em] sm:gap-2 sm:text-[13px]">
                  <RiTShirtAirLine className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="truncate">Care</span>
                </span>
                <span className="inline-flex shrink-0 text-lg text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "care" ? (
                    <FiChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <FiChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  <div className="px-0 pb-3 pt-0 sm:pb-4 md:pb-3 lg:pb-4">
                    {careBulletPoints.length > 0 && (
                      <ul className="space-y-1.5 font-inter font-normal text-xs leading-relaxed text-gray-700 sm:text-sm md:text-sm lg:text-base">
                        {careBulletPoints.map((point, idx) => (
                          <li
                            key={`${point.slice(0, 20)}-${idx}`}
                            className="flex gap-2"
                          >
                            <span
                              className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-gray-700"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 break-words">
                              {point}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* POLICY */}
            {/* <div className="border-b border-gray-300">
  <button
    type="button"
    className="flex w-full items-center justify-between py-3.5 text-left sm:py-4"
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
                className="flex w-full items-center justify-between py-3.5 text-left sm:py-4 cursor-pointer touch-manipulation"
                onClick={() => toggleSection("cod")}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium uppercase tracking-wider sm:text-sm md:text-sm lg:text-lg xl:text-[20px] xl:tracking-[3px] min-w-0 font-[Raleway]">
                  <FaTag className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="truncate">COD Policy </span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-lg sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "cod" ? (
                    <FiChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <FiChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <div className="border-b border-gray-300">
              <button
                type="button"
                className="flex w-full items-center justify-between py-3.5 text-left sm:py-4 cursor-pointer touch-manipulation"
                onClick={() => toggleSection("return")}
              >
                <span className="flex min-w-0 items-center gap-1.5 font-[Raleway] text-xs font-medium uppercase tracking-[0.18em] sm:gap-2 sm:text-[13px]">
                  <RiRefreshLine className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4" />
                  <span className="truncate">Return Policy</span>
                </span>
                <span className="inline-flex shrink-0 text-lg text-gray-500 transition-transform duration-200 ease-out sm:text-xl md:text-lg lg:text-[22px]">
                  {expandedSection === "return" ? (
                    <FiChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <FiChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{
                  gridTemplateRows:
                    expandedSection === "return"
                      ? "1fr"
                      : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-0 pb-3 pt-0 sm:pb-4 md:pb-3 lg:pb-4">
                    <ul className="list-disc space-y-1.5 pl-4 font-inter font-normal text-xs leading-relaxed text-gray-700 wrap-break-word sm:pl-5 sm:text-sm md:text-sm lg:text-base">
                      {splitReturnPolicyBullets(
                        returnPolicyDescription ||
                        item.returnPolicy?.text ||
                        DEFAULT_RETURN_POLICY_DESCRIPTION,
                      ).map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {item._id ? (
              <PairItWithProducts itemId={item._id} limit={8} compact />
            ) : null}

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

        <RelatedProducts
          itemId={item._id}
          subcategoryId={item.subcategoryId?._id ?? item.subcategoryId}
          categoryId={item.categoryId?._id ?? item.categoryId}
          limit={10}
        />
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
          className={`fixed inset-0 z-50 ${showSizeChart ? "visible" : "invisible"
            }`}
        >
          {/* BACKDROP */}
          <div
            onClick={() => setShowSizeChart(false)}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${showSizeChart ? "opacity-100" : "opacity-0"
              }`}
          />

          {/* RIGHT SLIDER */}
          <div
            className={`absolute right-0 top-0 h-full w-[94%] sm:w-[min(720px,94vw)] lg:w-[min(820px,95vw)] xl:w-[min(920px,96vw)] bg-white shadow-xl transform transition-transform duration-300 ${showSizeChart ? "translate-x-0" : "translate-x-full"
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
