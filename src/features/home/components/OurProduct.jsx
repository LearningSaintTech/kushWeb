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
import { itemLaunchCardProps, filterHomeVisibleProducts } from "../../../utils/productLaunch.js";

const CATEGORIES = ["MEN", "WOMEN", "UNISEX", "COUPLES"];
const ALL_CATEGORY_KEY = "__ALL__";
const CATEGORY_PRODUCT_LIMIT = 8;
/** How many API pages to scan while skipping coming-soon items. */
const MAX_SCAN_PAGES = 10;
const SCAN_PAGE_SIZE = 12;

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
    ...itemLaunchCardProps(item),
    ...listingBindOfferProps(item, section),
  };
}

function isMenLabel(label = "") {
  const l = String(label).toUpperCase();
  return (l === "MEN" || l.includes("MEN")) && !l.includes("WOMEN");
}

function isWomenLabel(label = "") {
  return String(label).toUpperCase().includes("WOMEN");
}

function interleave(a = [], b = []) {
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

/**
 * Walk API pages until we collect enough non–coming-soon products.
 */
async function collectVisibleByCategory(
  categoryId,
  {
    targetCount,
    startPage = 1,
    pageSize = SCAN_PAGE_SIZE,
    pincode,
    section,
    excludeIds = new Set(),
    maxPages = MAX_SCAN_PAGES,
  },
) {
  const collected = [];
  const seen = new Set(excludeIds);
  let page = Math.max(1, startPage);
  let totalPages = page;

  for (let i = 0; i < maxPages && collected.length < targetCount; i += 1) {
    const params = { categoryId, limit: pageSize, page };
    if (pincode) params.pinCode = String(pincode);
    const res = await itemsService.search(params);
    const data = res?.data?.data ?? res?.data;
    const raw = Array.isArray(data?.items) ? data.items : [];
    totalPages = Math.max(1, Number(data?.pagination?.totalPages) || page);

    const visible = filterHomeVisibleProducts(
      raw.map((item, idx) =>
        itemToCardProps(item, (page - 1) * pageSize + idx, section),
      ),
    );

    for (const card of visible) {
      const key = String(card.id ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      collected.push(card);
      if (collected.length >= targetCount) break;
    }

    if (collected.length >= targetCount) {
      return {
        items: collected,
        hasMore: page < totalPages,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        lastPage: page,
      };
    }

    if (raw.length === 0 || page >= totalPages) {
      break;
    }
    page += 1;
  }

  return {
    items: collected,
    hasMore: false,
    totalPages,
    nextPage: null,
    lastPage: page,
  };
}

function nextCursorFromCollect(result) {
  if (!result?.hasMore || result.nextPage == null) return null;
  return result.nextPage;
}

/**
 * Our Products — first batch on load; next batches only via Explore More.
 * Category tabs scan past coming-soon items. ALL interleaves Men + Women.
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

  const menCategory = categoriesWithId.find(
    (c) => c.id != null && isMenLabel(c.label),
  );
  const womenCategory = categoriesWithId.find(
    (c) => c.id != null && isWomenLabel(c.label),
  );
  const categoriesReady = categoriesWithId.some((c) => c.id != null);

  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_KEY);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreLockRef = useRef(false);
  /** Next API page for single-category tab. */
  const categoryCursorRef = useRef(1);
  /** Next API pages for ALL (men / women). */
  const allMenCursorRef = useRef(1);
  const allWomenCursorRef = useRef(1);
  const productsRef = useRef([]);

  const sectionTitle = section?.title || "OUR PRODUCTS";

  useEffect(() => {
    productsRef.current = categoryProducts;
  }, [categoryProducts]);

  useEffect(() => {
    if (import.meta.env.PROD) return;
    debugLog("[OurProduct] section meta:", {
      _id: section?._id,
      title: section?.title,
      menId: menCategory?.id,
      womenId: womenCategory?.id,
    });
  }, [section, menCategory?.id, womenCategory?.id]);

  const fetchByCategory = useCallback(
    async (categoryId, { append = false } = {}) => {
      if (!categoryId) {
        setCategoryProducts([]);
        setHasMore(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoadingInitial(true);

      try {
        const excludeIds = append
          ? new Set(productsRef.current.map((p) => String(p.id)))
          : new Set();
        const startPage = append ? categoryCursorRef.current || 1 : 1;
        const result = await collectVisibleByCategory(categoryId, {
          targetCount: CATEGORY_PRODUCT_LIMIT,
          startPage,
          pincode,
          section,
          excludeIds,
        });
        categoryCursorRef.current = nextCursorFromCollect(result) ?? 9999;
        setHasMore(Boolean(result.hasMore));
        setCategoryProducts((prev) =>
          append ? [...prev, ...result.items] : result.items,
        );
      } catch {
        if (!append) setCategoryProducts([]);
        setHasMore(false);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingInitial(false);
      }
    },
    [pincode, section],
  );

  const fetchAllMixed = useCallback(
    async ({ append = false } = {}) => {
      if (append) setLoadingMore(true);
      else setLoadingInitial(true);

      try {
        const half = Math.ceil(CATEGORY_PRODUCT_LIMIT / 2);
        const excludeIds = append
          ? new Set(productsRef.current.map((p) => String(p.id)))
          : new Set();

        // Prefer explicit Men + Women so ALL is not women-only.
        if (menCategory?.id || womenCategory?.id) {
          const menStart = append ? allMenCursorRef.current || 1 : 1;
          const womenStart = append ? allWomenCursorRef.current || 1 : 1;

          const [menResult, womenResult] = await Promise.all([
            menCategory?.id
              ? collectVisibleByCategory(menCategory.id, {
                  targetCount: half,
                  startPage: menStart,
                  pincode,
                  section,
                  excludeIds,
                })
              : Promise.resolve({
                  items: [],
                  hasMore: false,
                  lastPage: 1,
                }),
            womenCategory?.id
              ? collectVisibleByCategory(womenCategory.id, {
                  targetCount: half,
                  startPage: womenStart,
                  pincode,
                  section,
                  excludeIds,
                })
              : Promise.resolve({
                  items: [],
                  hasMore: false,
                  lastPage: 1,
                }),
          ]);

          allMenCursorRef.current = nextCursorFromCollect(menResult) ?? 9999;
          allWomenCursorRef.current =
            nextCursorFromCollect(womenResult) ?? 9999;

          let mixed = interleave(menResult.items, womenResult.items);

          // If one side was short, top up from the other.
          if (mixed.length < CATEGORY_PRODUCT_LIMIT) {
            const need = CATEGORY_PRODUCT_LIMIT - mixed.length;
            const mixedIds = new Set(mixed.map((p) => String(p.id)));
            const pool = [...menResult.items, ...womenResult.items].filter(
              (p) => !mixedIds.has(String(p.id)),
            );
            if (pool.length < need) {
              const useMen =
                menResult.items.length >= womenResult.items.length;
              const richerId = useMen
                ? menCategory?.id
                : womenCategory?.id;
              const richerStart = useMen
                ? allMenCursorRef.current || 1
                : allWomenCursorRef.current || 1;
              if (richerId) {
                const topUp = await collectVisibleByCategory(richerId, {
                  targetCount: need,
                  startPage: richerStart,
                  pincode,
                  section,
                  excludeIds: new Set([
                    ...excludeIds,
                    ...mixed.map((p) => String(p.id)),
                  ]),
                });
                if (useMen) {
                  allMenCursorRef.current =
                    nextCursorFromCollect(topUp) ?? allMenCursorRef.current;
                } else {
                  allWomenCursorRef.current =
                    nextCursorFromCollect(topUp) ?? allWomenCursorRef.current;
                }
                mixed = [...mixed, ...topUp.items];
              }
            } else {
              mixed = [...mixed, ...pool.slice(0, need)];
            }
          }

          mixed = mixed.slice(0, CATEGORY_PRODUCT_LIMIT);
          setHasMore(
            Boolean(menResult.hasMore) || Boolean(womenResult.hasMore),
          );
          setCategoryProducts((prev) =>
            append ? [...prev, ...mixed] : mixed,
          );
          return;
        }

        // Fallback: scan getAllVersion2 past coming-soon until we fill the grid.
        const collected = [];
        const seen = new Set(excludeIds);
        let page = append ? categoryCursorRef.current || 1 : 1;
        let totalPages = 1;

        for (
          let i = 0;
          i < MAX_SCAN_PAGES && collected.length < CATEGORY_PRODUCT_LIMIT;
          i += 1
        ) {
          const params = {
            isActive: true,
            page,
            limit: SCAN_PAGE_SIZE,
          };
          if (pincode) params.pinCode = String(pincode);
          const res = await itemsService.getAllVersion2(params);
          const data = res?.data?.data ?? res?.data;
          const raw = Array.isArray(data?.items) ? data.items : [];
          totalPages = Math.max(1, Number(data?.pagination?.totalPages) || page);
          const visible = filterHomeVisibleProducts(
            raw.map((item, idx) =>
              itemToCardProps(item, (page - 1) * SCAN_PAGE_SIZE + idx, section),
            ),
          );
          for (const card of visible) {
            const key = String(card.id ?? "");
            if (!key || seen.has(key)) continue;
            seen.add(key);
            collected.push(card);
            if (collected.length >= CATEGORY_PRODUCT_LIMIT) break;
          }
          if (collected.length >= CATEGORY_PRODUCT_LIMIT) {
            categoryCursorRef.current = page < totalPages ? page + 1 : 9999;
            setHasMore(page < totalPages);
            setCategoryProducts((prev) =>
              append ? [...prev, ...collected] : collected,
            );
            return;
          }
          if (raw.length === 0 || page >= totalPages) break;
          page += 1;
        }

        categoryCursorRef.current = 9999;
        setHasMore(false);
        setCategoryProducts((prev) =>
          append ? [...prev, ...collected] : collected,
        );
      } catch {
        if (!append) setCategoryProducts([]);
        setHasMore(false);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingInitial(false);
      }
    },
    [pincode, section, menCategory?.id, womenCategory?.id],
  );

  const handleExploreMore = useCallback(async () => {
    if (!hasMore || loadingMore || loadingInitial || loadingMoreLockRef.current) {
      return;
    }

    loadingMoreLockRef.current = true;
    try {
      if (activeCategoryId === ALL_CATEGORY_KEY) {
        await fetchAllMixed({ append: true });
      } else if (activeCategoryId) {
        await fetchByCategory(activeCategoryId, { append: true });
      }
    } finally {
      loadingMoreLockRef.current = false;
    }
  }, [
    hasMore,
    loadingMore,
    loadingInitial,
    activeCategoryId,
    fetchAllMixed,
    fetchByCategory,
  ]);

  useEffect(() => {
    setActiveCategoryId(ALL_CATEGORY_KEY);
  }, [section]);

  useEffect(() => {
    categoryCursorRef.current = 1;
    allMenCursorRef.current = 1;
    allWomenCursorRef.current = 1;
    loadingMoreLockRef.current = false;
    setHasMore(false);

    if (activeCategoryId === ALL_CATEGORY_KEY) {
      // Wait for category ids when possible so ALL can mix men + women.
      if (!categoriesReady && (section?.categoryId?.length || section?.categories?.length)) {
        return;
      }
      fetchAllMixed({ append: false });
    } else if (activeCategoryId) {
      fetchByCategory(activeCategoryId, { append: false });
    } else {
      setCategoryProducts([]);
    }
  }, [
    activeCategoryId,
    categoriesReady,
    menCategory?.id,
    womenCategory?.id,
    pincode,
    section?._id,
    section?.categoryId?.length,
    section?.categories?.length,
    fetchAllMixed,
    fetchByCategory,
  ]);

  const productsToShow = categoryProducts;

  const showExploreMore =
    Boolean(activeCategoryId) && hasMore && !loadingInitial;

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
              <div key={`${product.id ?? "p"}-${idx}`} className="flex h-full min-w-0 flex-col">
                <ProductCard
                  {...product}
                  {...PRODUCT_CARD_COMPACT_GRID_PROPS}
                />
              </div>
            ))}
        </div>

        {!loadingInitial && productsToShow.length === 0 ? (
          <p className="py-8 text-center font-inter text-sm text-gray-500">
            No products available in this category yet.
          </p>
        ) : null}

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
