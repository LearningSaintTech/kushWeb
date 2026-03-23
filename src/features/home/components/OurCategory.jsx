import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import productImage from "../../../assets/temporary/productimage.png";
import hoverProductImage from "../../../assets/temporary/hoverProductImage.png";
import collectionImage from "../../../assets/temporary/collection.png";
import {
  categoriesService,
  subcategoriesService,
} from "../../../services/categories.service.js";

const CATEGORY_TABS = ["MEN", "WOMEN", "UNISEX", "COUPLES"];

const CATEGORY_CARDS = [
  {
    id: 1,
    title: "BLAZERS",
    image: productImage,
    hoverImage: hoverProductImage,
  },
  {
    id: 2,
    title: "SHIRTS",
    image: productImage,
    hoverImage: hoverProductImage,
  },
  {
    id: 3,
    title: "JEANS",
    image: collectionImage,
    hoverImage: collectionImage,
  },
  { id: 4, title: "TOPS", image: productImage, hoverImage: hoverProductImage },
  {
    id: 5,
    title: "DRESSES",
    image: collectionImage,
    hoverImage: collectionImage,
  },
  {
    id: 6,
    title: "SKIRTS",
    image: productImage,
    hoverImage: hoverProductImage,
  },
  {
    id: 7,
    title: "JACKETS",
    image: collectionImage,
    hoverImage: collectionImage,
  },
  {
    id: 8,
    title: "TROUSERS",
    image: productImage,
    hoverImage: hoverProductImage,
  },
];

function mapCategoryToCard(
  cat,
  useSubcategoryLink = false,
  sectionId = null,
  parentCategoryId = null,
) {
  const id = cat._id ?? cat.id;
  const params = new URLSearchParams();
  if (sectionId) params.set("sectionId", sectionId);
  if (useSubcategoryLink) {
    const categoryId = parentCategoryId ?? cat.categoryId ?? cat.category ?? "";
    if (categoryId) params.set("categoryId", String(categoryId));
    params.set("subcategoryId", id);
  } else {
    params.set("categoryId", id);
  }
  const to = `/search?${params.toString()}`;
  return {
    id,
    title: (cat.name ?? "").toUpperCase() || "Category",
    image: cat.imageUrl || productImage,
    hoverImage: cat.imageUrl || hoverProductImage,
    to,
  };
}

function OurCategory({ section }) {
  const [sectionCategoriesResolved, setSectionCategoriesResolved] = useState(
    [],
  );
  const [sectionSubcategoriesResolved, setSectionSubcategoriesResolved] =
    useState([]);
  /** When section has only categories, we fetch subcategories for the active category on tab click */
  const [subcategoriesForActiveCategory, setSubcategoriesForActiveCategory] =
    useState([]);
  const [subcategoriesForActiveLoading, setSubcategoriesForActiveLoading] =
    useState(false);

  const hasPopulatedCategories = (section?.categories?.length ?? 0) > 0;
  const hasPopulatedSubcategories = (section?.subcategories?.length ?? 0) > 0;
  const hasCategoryIds =
    Array.isArray(section?.categoryId) && section.categoryId.length > 0;
  const hasSubcategoryIds =
    Array.isArray(section?.subcategoryId) && section.subcategoryId.length > 0;

  useEffect(() => {
    if (!section) {
      setSectionCategoriesResolved([]);
      setSectionSubcategoriesResolved([]);
      return;
    }
    if (hasPopulatedCategories && hasPopulatedSubcategories) {
      setSectionCategoriesResolved([]);
      setSectionSubcategoriesResolved([]);
      return;
    }
    const catIds = Array.isArray(section.categoryId) ? section.categoryId : [];
    const subIds = Array.isArray(section.subcategoryId)
      ? section.subcategoryId
      : [];
    const toStr = (id) =>
      id && typeof id === "object" && id.toString ? id.toString() : String(id);
    let cancelled = false;
    const catPromises = catIds.map((id) =>
      categoriesService
        .getById(toStr(id))
        .then((r) => r?.data?.data ?? r?.data)
        .catch(() => null),
    );
    const subPromises = subIds.map((id) =>
      subcategoriesService
        .getById(toStr(id))
        .then((r) => r?.data?.data ?? r?.data)
        .catch(() => null),
    );
    Promise.all([Promise.all(catPromises), Promise.all(subPromises)])
      .then(([catList, subList]) => {
        if (!cancelled) {
          setSectionCategoriesResolved(catList.filter(Boolean));
          setSectionSubcategoriesResolved(subList.filter(Boolean));
        }
      })
      .catch(() => {
        if (!cancelled) setSectionCategoriesResolved([]);
        setSectionSubcategoriesResolved([]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const categories = hasPopulatedCategories
    ? section.categories
    : sectionCategoriesResolved;
  const subcategories = hasPopulatedSubcategories
    ? section.subcategories
    : sectionSubcategoriesResolved;
  const hasCategories = categories.length > 0;
  const hasSubcategories = subcategories.length > 0;

  const categoryTabs = hasCategories
    ? categories.map((c) => (c.name ?? "").toUpperCase() || (c._id ?? c.id))
    : hasSubcategories
      ? [
          ...new Set(
            subcategories
              .map((s) => (s.name ?? "").toUpperCase() || (s._id ?? s.id))
              .filter(Boolean),
          ),
        ]
      : CATEGORY_TABS;

  const [activeTab, setActiveTab] = useState(() => categoryTabs[0] ?? "MEN");

  useEffect(() => {
    if (categoryTabs.length > 0 && !categoryTabs.includes(activeTab)) {
      setActiveTab(categoryTabs[0]);
    }
  }, [section, categories.length, subcategories.length]);

  const activeCategory = hasCategories
    ? (categories.find(
        (c) => ((c.name ?? "").toUpperCase() || (c._id ?? c.id)) === activeTab,
      ) ?? categories[0])
    : null;

  const sectionId = section?._id ? String(section._id) : null;

  const activeCategoryId = activeCategory
    ? String(activeCategory._id ?? activeCategory.id)
    : null;

  // When section has only categories (no subcategories), fetch subcategories for the active category on tab click
  const sectionHasOnlyCategories = hasCategories && !hasSubcategories;
  useEffect(() => {
    if (!sectionHasOnlyCategories || !activeCategoryId) {
      setSubcategoriesForActiveCategory([]);
      return;
    }
    let cancelled = false;
    setSubcategoriesForActiveLoading(true);
    subcategoriesService
      .getByCategoryId(activeCategoryId)
      .then((r) => {
        const data = r?.data?.data ?? r?.data;
        const list = data?.subcategories ?? data ?? [];
        if (!cancelled)
          setSubcategoriesForActiveCategory(
            Array.isArray(list) ? list.filter(Boolean) : [],
          );
      })
      .catch(() => {
        if (!cancelled) setSubcategoriesForActiveCategory([]);
      })
      .finally(() => {
        if (!cancelled) setSubcategoriesForActiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionHasOnlyCategories, activeCategoryId]);

  const cardsFromSection =
    hasCategories && hasSubcategories && activeCategory
      ? subcategories
          .filter(
            (sub) =>
              String(sub.categoryId ?? sub.category) ===
              String(activeCategory._id ?? activeCategory.id),
          )
          .map((sub) =>
            mapCategoryToCard(sub, true, sectionId, activeCategoryId),
          )
      : hasCategories && hasSubcategories
        ? []
        : sectionHasOnlyCategories && activeCategory
          ? subcategoriesForActiveCategory.map((sub) =>
              mapCategoryToCard(sub, true, sectionId, activeCategoryId),
            )
          : hasCategories
            ? categories.map((cat) => mapCategoryToCard(cat, false, sectionId))
            : hasSubcategories
              ? subcategories.map((sub) =>
                  mapCategoryToCard(
                    sub,
                    true,
                    sectionId,
                    sub.categoryId ?? sub.category,
                  ),
                )
              : null;

  const cards =
    hasCategories &&
    hasSubcategories &&
    activeCategory &&
    cardsFromSection?.length === 0
      ? [mapCategoryToCard(activeCategory, false, sectionId)]
      : sectionHasOnlyCategories &&
          activeCategory &&
          !subcategoriesForActiveLoading &&
          (cardsFromSection?.length ?? 0) === 0
        ? [mapCategoryToCard(activeCategory, false, sectionId)]
        : (cardsFromSection ?? CATEGORY_CARDS);

  const sectionTitle = section?.title || "OUR CATEGORY";
  const exploreTo = sectionId ? `/search?sectionId=${sectionId}` : "/search";

  return (
    <section className="bg-white py-10 sm:py-14 lg:py-20">
      <div className="max-w-[1150px] mx-auto px-4">
        {" "}
        <div className="flex flex-col items-center mb-10">
          <h2 className="font-Raleway text-3xl sm:text-4xl lg:text-4xl font-extrabold tracking-wide text-black text-center">
            {sectionTitle}
          </h2>

          {/* Single row, horizontally scrollable category tabs */}
          <div className="mt-8 w-full flex justify-center">
            <div className="overflow-x-auto w-full max-w-4xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-4 sm:gap-6 md:gap-8 justify-start sm:justify-center items-center px-4 min-w-max">
                {categoryTabs.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`relative whitespace-nowrap uppercase text-xs sm:text-sm md:text-base tracking-wider pb-2 transition-all duration-300
          
          ${
            activeTab === cat
              ? "text-black font-semibold"
              : "text-gray-400 hover:text-black"
          }`}
                  >
                    {cat}

                    {/* Animated underline */}
                    <span
                      className={`absolute left-0 bottom-0 h-[2px] w-full transition-all duration-300
            ${
              activeTab === cat ? "bg-black scale-x-100" : "bg-black scale-x-0"
            }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* ================= GRID ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {subcategoriesForActiveLoading ? (
            <div className="col-span-full flex items-center justify-center py-12 text-gray-500 text-sm uppercase tracking-wider">
              Loading…
            </div>
          ) : (
          cards.slice(0, 8).map((card) => {
            const Wrapper = card.to ? Link : "div";
            const wrapperProps = card.to ? { to: card.to } : {};
            return (
              <Wrapper
                key={card.id}
                {...wrapperProps}
                className={
                  card.to
                    ? "group relative overflow-hidden bg-gray-100  transition-all duration-500 hover:shadow-xl block"
                    : "group relative overflow-hidden bg-gray-100 rounded-xl transition-all duration-500 hover:shadow-xl"
                }
              >
                <div className="relative aspect-[3/4]">
                  {/* Default image */}
                  <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 group-hover:opacity-0"
                  />

                  {/* Hover image */}
                  <img
                    src={card.hoverImage}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-700" />

                  {/* Title */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <span
                      className="text-white text-sm sm:text-lg lg:text-xl font-bold uppercase tracking-wide 
                    opacity-100 sm:opacity-0 sm:translate-y-6 
                    sm:group-hover:translate-y-0 sm:group-hover:opacity-100 
                    transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    >
                      {card.title}
                    </span>
                  </div>
                </div>
              </Wrapper>
            );
          })
          )}
        </div>
        {/* Explore More — below cards */}
        {sectionId && (
          <div className="flex justify-center mt-10 sm:mt-12">
            <Link
              to={exploreTo}
              className="font-inter inline-flex items-center gap-1 uppercase text-xs sm:text-sm tracking-widest text-black border-b border-black pb-1 hover:opacity-70 transition-opacity cursor-pointer"
            >
              <span>Explore More</span>
              <IoChevronForward className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default OurCategory;
