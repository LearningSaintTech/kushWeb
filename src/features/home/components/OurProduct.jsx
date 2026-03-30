import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import ProductCard from "../../../shared/components/ProductCard";
import productImage from "../../../assets/temporary/productimage.png";
import hoverProductImage from "../../../assets/temporary/hoverProductImage.png";
import { itemsService } from "../../../services/items.service.js";
import { categoriesService } from "../../../services/categories.service.js";

const CATEGORIES = ["MEN", "WOMEN", "UNISEX", "COUPLES"];
const ALL_CATEGORY_KEY = "__ALL__";
const CATEGORY_PRODUCT_LIMIT = 8;
const FIRST_LOAD_MORE_DELAY_MS = 1000;

const PRODUCTS_STATIC = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  image: productImage,
  hoverImage: hoverProductImage,
  title: "DENIM JACKET",
  price: "₹1500.00",
  delivery: "GET IN 6-7 days",
  rating: 4.5,
}));

function itemToCardProps(item, index) {
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
    price,
    originalPrice,
    delivery,
    rating: item.avgRating ?? 4.5,
    outOfStock: item.inStock === false,
  };
}

function OurProduct({ section }) {
  const pincode = useSelector((s) => s?.location?.pincode) ?? null;
  const [sectionCategoriesResolved, setSectionCategoriesResolved] = useState(
    [],
  );

  const hasPopulatedCategories = section?.categories?.length > 0;
  const hasCategoryIds =
    Array.isArray(section?.categoryId) && section.categoryId.length > 0;

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

  const [activeCategoryId, setActiveCategoryId] = useState(
    ALL_CATEGORY_KEY,
  );
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef(null);
  const firstLoadDelayAppliedRef = useRef(false);
  const firstLoadDelayTimerRef = useRef(null);
  const loadingMoreLockRef = useRef(false);

  const sectionTitle = section?.title || "OUR PRODUCTS";

  const listFromSection =
    section?.products
      ?.filter((p) => p?.item)
      ?.map((p, i) => ({
        ...itemToCardProps(p.item, i),
        outOfStock: p.inStock === false,
      })) ?? [];

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
          itemToCardProps(item, (page - 1) * CATEGORY_PRODUCT_LIMIT + i),
        );

        setCategoryProducts((prev) => (page === 1 ? items : [...prev, ...items]));
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
    [pincode],
  );

  const fetchAllVersion2 = useCallback(async (page = 1) => {
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
        itemToCardProps(item, (page - 1) * CATEGORY_PRODUCT_LIMIT + i),
      );
      const totalPages = Number(data?.pagination?.totalPages || 0);

      setCategoryProducts((prev) => (page === 1 ? items : [...prev, ...items]));
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
  }, [pincode]);

  const loadMoreByActiveTab = useCallback(
    async (nextPage) => {
      if (loadingMoreLockRef.current) return;
      loadingMoreLockRef.current = true;
      try {
        if (nextPage === 2 && !firstLoadDelayAppliedRef.current) {
          firstLoadDelayAppliedRef.current = true;
          await new Promise((resolve) => {
            firstLoadDelayTimerRef.current = setTimeout(() => {
              firstLoadDelayTimerRef.current = null;
              resolve();
            }, FIRST_LOAD_MORE_DELAY_MS);
          });
        }

        if (activeCategoryId === ALL_CATEGORY_KEY) {
          await fetchAllVersion2(nextPage);
          return;
        }

        await fetchByCategory(activeCategoryId, nextPage);
      } finally {
        loadingMoreLockRef.current = false;
      }
    },
    [activeCategoryId, fetchByCategory, fetchAllVersion2],
  );

  useEffect(() => {
    setActiveCategoryId(ALL_CATEGORY_KEY);
  }, [section]);

  useEffect(() => {
    if (listFromSection.length > 0 && activeCategoryId !== ALL_CATEGORY_KEY) {
      setCategoryProducts([]);
      setCurrentPage(1);
      setHasMore(false);
      firstLoadDelayAppliedRef.current = false;
      if (firstLoadDelayTimerRef.current) {
        clearTimeout(firstLoadDelayTimerRef.current);
        firstLoadDelayTimerRef.current = null;
      }
      loadingMoreLockRef.current = false;
      return;
    }
    if (activeCategoryId === ALL_CATEGORY_KEY) {
      setCurrentPage(1);
      setHasMore(false);
      firstLoadDelayAppliedRef.current = false;
      if (firstLoadDelayTimerRef.current) {
        clearTimeout(firstLoadDelayTimerRef.current);
        firstLoadDelayTimerRef.current = null;
      }
      loadingMoreLockRef.current = false;
      fetchAllVersion2();
    } else if (activeCategoryId) {
      setCurrentPage(1);
      setHasMore(true);
      firstLoadDelayAppliedRef.current = false;
      if (firstLoadDelayTimerRef.current) {
        clearTimeout(firstLoadDelayTimerRef.current);
        firstLoadDelayTimerRef.current = null;
      }
      loadingMoreLockRef.current = false;
      fetchByCategory(activeCategoryId, 1);
    } else {
      setCategoryProducts([]);
      setCurrentPage(1);
      setHasMore(false);
      firstLoadDelayAppliedRef.current = false;
      if (firstLoadDelayTimerRef.current) {
        clearTimeout(firstLoadDelayTimerRef.current);
        firstLoadDelayTimerRef.current = null;
      }
      loadingMoreLockRef.current = false;
    }
  }, [activeCategoryId, listFromSection.length, fetchByCategory, fetchAllVersion2]);

  useEffect(() => {
    if (
      (listFromSection.length > 0 && activeCategoryId !== ALL_CATEGORY_KEY) ||
      !activeCategoryId
    ) {
      return;
    }
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMore &&
          !loadingInitial &&
          !loadingMore &&
          !loadingMoreLockRef.current
        ) {
          const nextPage = currentPage + 1;
          loadMoreByActiveTab(nextPage);
        }
      },
      { root: null, rootMargin: "120px", threshold: 0.1 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (firstLoadDelayTimerRef.current) {
        clearTimeout(firstLoadDelayTimerRef.current);
        firstLoadDelayTimerRef.current = null;
      }
      loadingMoreLockRef.current = false;
    };
  }, [
    activeCategoryId,
    currentPage,
    hasMore,
    loadingInitial,
    loadingMore,
    loadMoreByActiveTab,
    listFromSection.length,
  ]);

  const productsToShow =
    activeCategoryId === ALL_CATEGORY_KEY
      ? categoryProducts
      : listFromSection.length > 0
        ? listFromSection
        : categoryProducts.length > 0
          ? categoryProducts
          : PRODUCTS_STATIC;

  const handleTabClick = (cat) => {
    if (cat.id === ALL_CATEGORY_KEY) {
      setActiveCategoryId(ALL_CATEGORY_KEY);
      return;
    }
    if (cat.id != null) setActiveCategoryId(cat.id);
  };

  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col lg:ml-[6vw] lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">
          {/* LEFT SIDE */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full">
            {/* TITLE */}
            <h2 className="font-raleway text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wide text-black">
              {sectionTitle}
            </h2>

            {/* CATEGORY TABS */}
            <div className="font-inter flex gap-6 mt-6 overflow-x-auto scrollbar-hide">
              <button
                key={ALL_CATEGORY_KEY}
                type="button"
                onClick={() => setActiveCategoryId(ALL_CATEGORY_KEY)}
                className={`uppercase text-xs sm:text-sm tracking-widest pb-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeCategoryId === ALL_CATEGORY_KEY
                    ? "text-black border-b border-black"
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
                  className={`uppercase text-xs sm:text-sm tracking-widest pb-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    activeCategoryId === cat.id
                      ? "text-black border-b border-black"
                      : "text-gray-400 hover:text-black"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ================= PRODUCT GRID (1 card on mobile) ================= */}
        {loadingInitial && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Loading...
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6">
          {!loadingInitial &&
            productsToShow.map((product, idx) => (
              <ProductCard
                key={product.id ?? idx}
                {...product}
                rounded="none"
              />
            ))}
        </div>
        {(activeCategoryId === ALL_CATEGORY_KEY || listFromSection.length === 0) &&
          activeCategoryId &&
          hasMore && (
          <div ref={loadMoreRef} className="h-2 w-full" />
        )}
        {(activeCategoryId === ALL_CATEGORY_KEY || listFromSection.length === 0) &&
          loadingMore && (
          <div className="text-center py-6 text-gray-500 text-sm">
            Loading more products...
          </div>
        )}
      </div>
    </section>
  );
}

export default OurProduct;
