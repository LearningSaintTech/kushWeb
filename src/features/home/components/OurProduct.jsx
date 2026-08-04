import React, { useState, useEffect, useCallback, useRef } from "react";
import { debugLog } from '../../../utils/debugLog.js';
import { useSelector } from "react-redux";
import { IoChevronForward } from "react-icons/io5";
import ProductCard, { PRODUCT_CARD_COMPACT_GRID_PROPS } from "../../../shared/components/ProductCard";
import productImage from "../../../assets/temporary/productimage.png";
import hoverProductImage from "../../../assets/temporary/hoverProductImage.png";
import { itemsService } from "../../../services/items.service.js";
import { categoriesService } from "../../../services/categories.service.js";
import { getItemStockTotal } from "../../../utils/productStock.js";
import { listingBindOfferProps } from "../../../utils/bindOffer.js";

const CATEGORIES = ["MEN", "WOMEN", "UNISEX", "COUPLES"];
const ALL_CATEGORY_KEY = "__ALL__";
const CATEGORY_PRODUCT_LIMIT = 8;

const PRODUCTS_STATIC = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  image: productImage,
  hoverImage: hoverProductImage,
  title: "DENIM JACKET",
  price: "₹1500.00",
  delivery: "GET IN 6-7 days",
  rating: 4.5,
}));

function sectionProductItem(product) {
  const item = product?.item;
  if (!item) return null;
  return {
    ...item,
    bindOffer: item.bindOffer ?? product.bindOffer ?? null,
  };
}

function itemToCardProps(item, index, section = null) {
  const id = item._id ?? item.id ?? index;
  const variants = item.variants ?? [];
  const firstVariant = variants[0];
  const images = firstVariant?.images ?? [];
  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const imageUrl = sorted[0]?.url ?? item.thumbnail ?? productImage;
  const hoverUrl = sorted[1]?.url ?? imageUrl ?? hoverProductImage;
  const price =
    item.discountedPrice != null
      ? `₹${Number(item.discountedPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : "₹0.00";
  const originalPrice =
    item.discountedPrice != null &&
    item.price != null &&
    Number(item.price) > Number(item.discountedPrice)
      ? `₹${Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : undefined;
  const delivery =
    item.deliveryType === "90_MIN"
      ? "90 min"
      : item.deliveryType === "ONE_DAY"
        ? "1 day"
        : item.deliveryType
          ? String(item.deliveryType)
          : "GET IN 6-7 days";
  return {
    id,
    image: imageUrl,
    hoverImage: hoverUrl,
    title: item.name ?? "Product",
    shortDescription: item.shortDescription ?? "",
    stock: getItemStockTotal(item),
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 4.5,
    outOfStock: item.inStock === false,
    ...listingBindOfferProps(item, section),
  };
}

/**
 * Our Products — first batch on load; next batches only via Explore More (same page).
 * No infinite / auto scroll loading.
 */
function OurProduct({ section }) {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null;
  const [sectionCategoriesResolved, setSectionCategoriesResolved] = useState(
    [],
  );

  const hasPopulatedCategories = section?.categories?.length > 0;

  useEffect(() => {
    if (!section || (section.categories?.length ?? 0) > 0) {
      setSectionCategoriesResolved([]);
      return;
    }
    const catIds = Array.isArray(section.categoryId) ? section.categoryId : [];
    if (catIds.length === 0) return;
    const ids = catIds.map((id) =>
      id && typeof id === "object" && id.toString ? id.toString() : String(id),
    );
    let cancelled = false;
    Promise.all(
      ids.map((id) =>
        categoriesService
          .getById(id)
          .then((r) => r?.data?.data ?? r?.data)
          .catch(() => null),
      ),
    )
      .then((list) => {
        if (!cancelled) setSectionCategoriesResolved(list.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setSectionCategoriesResolved([]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const categoriesWithId = hasPopulatedCategories
    ? section.categories.map((c) => ({
        id: c._id ?? c.id,
        label: (c.name ?? "").toUpperCase() || String(c._id ?? c.id),
      }))
    : sectionCategoriesResolved.length > 0
      ? sectionCategoriesResolved.map((c) => ({
          id: c._id ?? c.id,
          label: (c.name ?? "").toUpperCase() || String(c._id ?? c.id),
        }))
      : CATEGORIES.map((label) => ({ id: null, label }));

  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_KEY);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreLockRef = useRef(false);

  const sectionTitle = section?.title || "OUR PRODUCTS";

  const listFromSection =
    section?.products
      ?.filter((p) => p?.item)
      ?.map((p, i) => {
        const item = sectionProductItem(p);
        return {
          ...itemToCardProps(item, i, section),
          outOfStock: p.inStock === false,
        };
      }) ?? [];

  /** When a category tab uses section products, Explore More is not used for paging. */
  const usesSectionList =
    listFromSection.length > 0 && activeCategoryId !== ALL_CATEGORY_KEY;

  useEffect(() => {
    if (import.meta.env.PROD) return;
    debugLog("[OurProduct] section meta:", {
      _id: section?._id,
      title: section?.title,
      listFromSection: listFromSection.length,
    });
  }, [section, listFromSection.length]);

  const fetchByCategory = useCallback(
    async (categoryId, page = 1) => {
      if (!categoryId) {
        setCategoryProducts([]);
        setCurrentPage(1);
        setHasMore(false);
        return;
      }
      if (page === 1) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const params = { categoryId, limit: CATEGORY_PRODUCT_LIMIT, page };
        if (pincode) params.pinCode = String(pincode);
        const res = await itemsService.search(params);
        const data = res?.data?.data ?? res?.data;
        const items = (data?.items ?? []).map((item, i) =>
          itemToCardProps(item, (page - 1) * CATEGORY_PRODUCT_LIMIT + i, section),
        );

        setCategoryProducts((prev) =>
          page === 1 ? items : [...prev, ...items],
        );
        setCurrentPage(page);
        setHasMore(items.length === CATEGORY_PRODUCT_LIMIT);
      } catch {
        if (page === 1) setCategoryProducts([]);
        setHasMore(false);
      } finally {
        if (page === 1) setLoadingInitial(false);
        else setLoadingMore(false);
      }
    },
    [pincode, section],
  );

  const fetchAllVersion2 = useCallback(
    async (page = 1) => {
      if (page === 1) setLoadingInitial(true);
      else setLoadingMore(true);
      try {
        const params = {
          isActive: true,
          page,
          limit: CATEGORY_PRODUCT_LIMIT,
        };
        if (pincode) params.pinCode = String(pincode);
        const res = await itemsService.getAllVersion2({
          ...params,
        });
        const data = res?.data?.data ?? res?.data;
        const items = (data?.items ?? []).map((item, i) =>
          itemToCardProps(item, (page - 1) * CATEGORY_PRODUCT_LIMIT + i, section),
        );
        const totalPages = Number(data?.pagination?.totalPages || 0);

        setCategoryProducts((prev) =>
          page === 1 ? items : [...prev, ...items],
        );
        setCurrentPage(page);
        if (totalPages > 0) {
          setHasMore(page < totalPages);
        } else {
          setHasMore(items.length === CATEGORY_PRODUCT_LIMIT);
        }
      } catch {
        if (page === 1) setCategoryProducts([]);
        setHasMore(false);
      } finally {
        if (page === 1) setLoadingInitial(false);
        else setLoadingMore(false);
      }
    },
    [pincode, section],
  );

  const handleExploreMore = useCallback(async () => {
    if (!hasMore || loadingMore || loadingInitial || loadingMoreLockRef.current) {
      return;
    }
    if (usesSectionList) return;

    loadingMoreLockRef.current = true;
    const nextPage = currentPage + 1;
    try {
      if (activeCategoryId === ALL_CATEGORY_KEY) {
        await fetchAllVersion2(nextPage);
      } else if (activeCategoryId) {
        await fetchByCategory(activeCategoryId, nextPage);
      }
    } finally {
      loadingMoreLockRef.current = false;
    }
  }, [
    hasMore,
    loadingMore,
    loadingInitial,
    usesSectionList,
    currentPage,
    activeCategoryId,
    fetchAllVersion2,
    fetchByCategory,
  ]);

  useEffect(() => {
    setActiveCategoryId(ALL_CATEGORY_KEY);
  }, [section]);

  useEffect(() => {
    if (listFromSection.length > 0 && activeCategoryId !== ALL_CATEGORY_KEY) {
      setCategoryProducts([]);
      setCurrentPage(1);
      setHasMore(false);
      loadingMoreLockRef.current = false;
      return;
    }
    if (activeCategoryId === ALL_CATEGORY_KEY) {
      setCurrentPage(1);
      setHasMore(false);
      loadingMoreLockRef.current = false;
      fetchAllVersion2(1);
    } else if (activeCategoryId) {
      setCurrentPage(1);
      setHasMore(false);
      loadingMoreLockRef.current = false;
      fetchByCategory(activeCategoryId, 1);
    } else {
      setCategoryProducts([]);
      setCurrentPage(1);
      setHasMore(false);
      loadingMoreLockRef.current = false;
    }
  }, [
    activeCategoryId,
    listFromSection.length,
    fetchByCategory,
    fetchAllVersion2,
  ]);

  const productsToShow =
    activeCategoryId === ALL_CATEGORY_KEY
      ? categoryProducts
      : listFromSection.length > 0
        ? listFromSection
        : categoryProducts.length > 0
          ? categoryProducts
          : PRODUCTS_STATIC;

  const showExploreMore =
    !usesSectionList &&
    Boolean(activeCategoryId) &&
    hasMore &&
    !loadingInitial;

  const handleTabClick = (cat) => {
    if (cat.id === ALL_CATEGORY_KEY) {
      setActiveCategoryId(ALL_CATEGORY_KEY);
      return;
    }
    if (cat.id != null) setActiveCategoryId(cat.id);
  };

  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-9xl px-4 sm:px-8 md:px-8 lg:px-8">
        <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="font-raleway text-2xl font-extrabold tracking-wide text-black sm:text-4xl md:text-5xl">
              {sectionTitle}
            </h2>

            <div className="font-inter mt-6 flex gap-6 overflow-x-auto scrollbar-hide">
              <button
                key={ALL_CATEGORY_KEY}
                type="button"
                onClick={() => setActiveCategoryId(ALL_CATEGORY_KEY)}
                className={`shrink-0 cursor-pointer whitespace-nowrap pb-2 text-xs uppercase tracking-widest transition-all sm:text-sm ${
                  activeCategoryId === ALL_CATEGORY_KEY
                    ? "border-b border-black text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                ALL
              </button>
              {categoriesWithId.map((cat) => (
                <button
                  key={cat.id ?? cat.label}
                  type="button"
                  onClick={() => handleTabClick(cat)}
                  className={`shrink-0 cursor-pointer whitespace-nowrap pb-2 text-xs uppercase tracking-widest transition-all sm:text-sm ${
                    activeCategoryId === cat.id
                      ? "border-b border-black text-black"
                      : "text-gray-400 hover:text-black"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingInitial && (
          <div className="py-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        )}
        <div className="grid grid-cols-2 items-stretch gap-x-1.5 gap-y-2.5 sm:gap-x-3 sm:gap-y-4 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
          {!loadingInitial &&
            productsToShow.map((product, idx) => (
              <div key={product.id ?? idx} className="flex h-full min-w-0 flex-col">
                <ProductCard
                  {...product}
                  {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                />
              </div>
            ))}
        </div>

        {loadingMore ? (
          <div className="py-6 text-center text-sm text-gray-500">
            Loading more products...
          </div>
        ) : null}

        {showExploreMore ? (
          <div className="mt-10 flex justify-center sm:mt-12">
            <button
              type="button"
              onClick={handleExploreMore}
              disabled={loadingMore}
              className="font-inter inline-flex cursor-pointer items-center gap-1 border-b border-black pb-1 text-xs uppercase tracking-widest text-black transition-opacity hover:opacity-70 disabled:cursor-wait disabled:opacity-50 sm:text-sm"
            >
              <span>Explore More</span>
              <IoChevronForward className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default OurProduct;
