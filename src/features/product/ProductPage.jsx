import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaTag } from "react-icons/fa6";
import { RiFileList2Line, RiRefreshLine, RiTruckLine } from "react-icons/ri";
import { HeartIcon } from "../../shared/ui/icons";
import { itemsService } from "../../services/items.service.js";
import { deliveryService } from "../../services/delivery.service.js";
import { useAuth } from "../../app/context/AuthContext";
import { useCartWishlist } from "../../app/context/CartWishlistContext";
import { ROUTES } from "../../utils/constants";
import productImage from "../../assets/temporary/productimage.png";
import ReviewRating from "./components/ReviewRating";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pincode = useSelector((s) => s?.location?.pincode) ?? null;
  const { isAuthenticated, openAuthModal } = useAuth();
  const { cart, addToCart, toggleWishlist, isInWishlist } = useCartWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState(null);

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [expandedSection, setExpandedSection] = useState("");
  const [deliveryOptionsFromPincode, setDeliveryOptionsFromPincode] = useState(
    [],
  );

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
        console.log("[ProductPage] product details API response:", {
          dataKeys: data ? Object.keys(data) : [],
          hasItem: !!item,
          itemId: item?._id,
          variantsCount: item?.variants?.length,
        });
        if (item?.variants?.length) {
          item.variants.forEach((v, i) => {
            console.log("[ProductPage] API variant[" + i + "]:", {
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
        setSelectedImageIndex(0);
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
      return item?.thumbnail ? [item.thumbnail] : [productImage];
    }
    const sorted = [...selectedVariant.images].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    return sorted.map((img) => img.url).filter(Boolean);
  }, [selectedVariant, item?.thumbnail]);

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

  const mainImage = images[selectedImageIndex] ?? images[0] ?? productImage;

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
    const imageUrl = selectedVariant.images?.[0]?.url ?? item.thumbnail ?? "";
    return {
      id: item._id,
      _id: item._id,
      title: item.name,
      price: priceDisplay,
      originalPrice: originalPriceDisplay ?? undefined,
      image: imageUrl,
      hoverImage: imageUrl,
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
  ]);

  console.log("[ProductPage] product details state:", {
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
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!productForCart || !selectedSizeObj?.inStock) return;
    setCartError(null);
    const result = await addToCart(productForCart, pincode);
    if (result?.success === false && result?.message) {
      setCartError(result.message);
      setTimeout(() => setCartError(null), 4000);
      return;
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 4000);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!item) return;
    const imageUrl = selectedVariant?.images?.[0]?.url ?? item.thumbnail ?? "";
    const hoverUrl = selectedVariant?.images?.[1]?.url ?? imageUrl;
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

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (!productForCart || !selectedSizeObj?.inStock) return;
    setCartError(null);
    const result = await addToCart(productForCart, pincode);
    if (result?.success === false && result?.message) {
      setCartError(result.message);
      setTimeout(() => setCartError(null), 4000);
      return;
    }
    navigate(ROUTES.CART);
  };

  const toggleSection = (key) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pt-20 pb-10 font-inter sm:pt-24 sm:pb-12 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16">
        <div className="px-4 sm:px-6 md:px-8 lg:px-[6vw] max-w-[1600px] mx-auto flex items-center justify-center py-16 sm:py-20">
          <p className="text-sm sm:text-base text-gray-500">Loading product…</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-100 pt-20 pb-10 font-inter sm:pt-24 sm:pb-12 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16">
        <div className="px-4 sm:px-6 md:px-8 lg:px-[6vw] max-w-[1600px] mx-auto flex flex-col items-center justify-center py-16 sm:py-20">
          <p className="text-sm sm:text-base text-gray-600 text-center px-4">
            {error || "Product not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-5 bg-gray-100 pt-20 pb-10 font-inter sm:pt-24 sm:pb-12 md:pt-28 md:pb-14 lg:pt-32 lg:pb-16">
      <div className="px-4 sm:px-6 md:px-8 lg:px-[6vw] ">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8  lg:gap-6  xl:gap-8">
          {/* LEFT SIDE - Gallery */}
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <div className="w-full max-w-full bg-white overflow-hidden rounded-none sm:rounded-lg lg:rounded-none">
              <div className="aspect-square w-full max-w-full sm:aspect-square lg:max-h-[620px] lg:aspect-square">
                <img
                  src={mainImage}
                  alt={item.name}
                  className="h-full w-full max-w-full object-cover object-center"
                />
              </div>
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide sm:mt-3 sm:gap-2 md:mt-4 md:gap-4 lg:mt-5 lg:flex-wrap lg:overflow-visible pb-1 lg:pb-0 min-w-0 max-w-full">
              {images.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-11 w-11 min-w-11 max-w-full shrink-0 overflow-hidden border-2 bg-white sm:h-14 sm:w-14 sm:min-w-14 md:h-20 md:w-20 md:min-w-20 lg:h-[100px] lg:w-[100px] lg:min-w-0 lg:max-h-[100px] lg:max-w-[110px] xl:h-[120px] xl:w-[120px] xl:max-h-[120px] xl:max-w-[128px] cursor-pointer ${selectedImageIndex === idx ? "border-black" : "border-transparent"}`}
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full max-w-full max-h-full object-cover object-center"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE - Details (compact 768–1024px) */}
          <div className="bg-[#f5f5f5] px-0 sm:px-4 md:px-4 lg:px-10 xl:px-10 font-inter min-w-0 flex flex-col">
            <div className="flex justify-between items-start gap-2 sm:gap-3 md:gap-3 lg:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-medium uppercase tracking-wide text-black sm:text-lg sm:tracking-[4px] md:text-xl md:tracking-[4px] lg:text-2xl lg:tracking-[5px] xl:text-3xl xl:tracking-[6px] wrap-break-word">
                  {item.name}
                </h1>
                <p className="font-inter mt-1 sm:mt-1.5 font-normal capitalize text-[#646464] wrap-break-word text-xs sm:text-sm md:text-sm lg:text-lg xl:text-xl">
                  {item.shortDescription || ""}
                </p>
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
                  {item.avgRating != null && Number(item.avgRating) > 0 && (
                    <div className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white sm:px-2.5 sm:py-1 sm:text-xs md:text-xs lg:px-[14px] lg:py-[5px] lg:text-[14px]">
                      ★{" "}
                      {Number(item.avgRating).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleWishlist}
                className="shrink-0 rounded p-1.5 sm:p-2 hover:bg-black/5 cursor-pointer touch-manipulation"
                aria-label={
                  inWishlist ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <HeartIcon
                  className={`h-5 w-5 sm:h-6 sm:w-6 md:h-6 md:w-6 lg:h-7 lg:w-7 ${inWishlist ? "fill-black text-black" : "text-black"}`}
                />
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
                          onClick={() => setSelectedColor(c.id)}
                          className={`box-border flex h-5 min-h-5 max-h-5 w-5 min-w-5 max-w-5 shrink-0 items-center justify-center rounded-full border-2 p-0 sm:h-6 sm:min-h-6 sm:max-h-6 sm:w-6 sm:min-w-6 sm:max-w-6 md:h-5 md:min-h-5 md:max-h-5 md:w-5 md:min-w-5 md:max-w-5 lg:h-[26px] lg:min-h-[26px] lg:max-h-[26px] lg:w-[26px] lg:min-w-[26px] lg:max-w-[26px] cursor-pointer ${selectedColor === c.id ? "border-[#e53935]" : "border-gray-300"}`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2 lg:gap-3">
                    <span className="text-[11px] sm:text-xs md:text-xs lg:text-[15px] text-gray-700">
                      Size
                    </span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2 lg:gap-[10px]">
                      {sizes.map((s) => (
                        <button
                          key={s.sku}
                          type="button"
                          onClick={() => s.inStock && setSelectedSize(s.size)}
                          disabled={!s.inStock}
                          title={
                            s.inStock
                              ? `Size ${s.size} - Available`
                              : `Size ${s.size} - Out of stock`
                          }
                          className={`flex h-7 w-7 min-w-7 items-center justify-center rounded-full border text-[11px] sm:h-8 sm:w-8 sm:min-w-8 sm:text-xs md:h-8 md:w-8 md:min-w-8 md:text-xs lg:h-9 lg:w-9 lg:min-w-9 lg:text-sm xl:h-[36px] xl:w-[36px] xl:min-w-[36px] xl:text-[14px] touch-manipulation ${
                            selectedSize === s.size
                              ? s.inStock
                                ? "border-black bg-black text-white cursor-pointer"
                                : "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                              : s.inStock
                                ? "border-gray-400 bg-white text-gray-700 cursor-pointer hover:border-gray-600"
                                : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-60 line-through"
                          }`}
                        >
                          {s.size}
                        </button>
                      ))}
                    </div>
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
                    <p className="text-xs sm:text-sm md:text-sm lg:text-base text-gray-700 wrap-break-word">
                      {item.longDescription || ""}
                    </p>
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
                  <RiTruckLine className="h-3 w-3 shrink-0 text-gray-500 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">Care</span>
                </span>
                <span className="inline-flex shrink-0 text-gray-500 transition-transform duration-200 ease-out text-lg sm:text-xl md:text-lg lg:text-[22px]">
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
                  <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3 md:mt-3 md:gap-2 lg:mt-5 lg:gap-[12px]">
                    <div className="shrink-0 text-gray-500">
                      <RiTruckLine
                        className="h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4 lg:h-6 lg:w-6"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm md:text-sm lg:text-base xl:text-[16px] text-gray-800">
                        {item.shipping?.title || "Free Flat Rate Shipping"}
                      </p>
                      <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs md:text-xs lg:text-sm xl:text-[15px] text-gray-500">
                        {item.shipping?.estimatedDelivery ||
                          "Estimated delivery based on your pincode."}
                      </p>
                      {item.care?.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {item.care.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COD POLICY */}
            <div className="border-b border-gray-300">
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
            </div>

            {/* RETURN POLICY */}
            <div className="border-b border-gray-300">
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
            </div>

            <div className="mt-4 sm:mt-6 md:mt-6 flex flex-col gap-2.5 sm:gap-3 md:gap-3 lg:mt-10 lg:gap-4 xl:mt-[50px] xl:gap-[25px]">
              {inCart || addedToCart ? (
                <>
                  <p className="h-10 w-full flex items-center justify-center border border-black text-xs font-medium uppercase tracking-wider text-black sm:h-11 md:h-11 lg:h-14 xl:h-[64px] sm:text-sm md:text-sm lg:text-[16px] lg:tracking-[2px]">
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

        <ReviewRating itemId={item._id} />
      </div>
    </div>
  );
}

export default ProductPage;
