import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { ROUTES, getSearchPath } from "../../utils/constants";
import { useAuth } from "../../app/context/AuthContext";
import { useCartWishlist } from "../../app/context/CartWishlistContext";
import { useNavbarMenu } from "../../app/hooks/useNavbarMenu";
import { searchKeywordsService } from "../../services/search.service.js";
import {
  addRecentKeyword,
  removeRecentKeyword,
} from "../../app/store/slices/searchSlice.js";
import { SearchIcon, HeartIcon, CartIcon, ProfileIcon, NotificationIcon } from "../ui/icons";
import { useNotification } from "../../app/context/NotificationContext";
// Location picker in header: no map – shows delivery location as text (current location / search / pincode).
import LocationPicker from "./LocationPicker";
import ProfileModal from "./ProfileModal";

import logoImg from "../../assets/images/navBar/khush-logo.svg";

function ChevronDownIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function DiamondIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 8 8" fill="currentColor">
      <path d="M4 0L8 4L4 8L0 4L4 0z" />
    </svg>
  );
}

function HamburgerIcon({ className, open }) {
  if (open) {
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function TrendingIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function IconBadge({ count, children, scrolled }) {
  return (
    <span className="relative inline-block">
      {children}
      {count > 0 && (
        <span
          className={`font-inter absolute -right-1 -top-1 md:-right-[0.52vw] md:-top-[0.52vw] flex h-3 w-3 md:h-[0.83vw] md:min-w-[0.83vw] items-center justify-center rounded-full px-0.5 md:px-[0.21vw] text-[10px] md:text-[0.52vw] font-medium ${
            scrolled ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

/** Build search URL for menu links; SearchPage reads categoryId + subcategoryId (or category/subcategory) */
function getSearchUrl({
  categoryId,
  subcategoryId,
  categoryName,
  subcategoryName,
} = {}) {
  return getSearchPath({
    categoryId,
    subcategoryId,
    categoryName,
    subcategoryName,
  });
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const recentFromRedux = useSelector(
    (s) => s?.search?.recentKeywords ?? [],
    shallowEqual,
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchPanelAnimated, setSearchPanelAnimated] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [recentFromApi, setRecentFromApi] = useState(false);
  const [searchModalLoading, setSearchModalLoading] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [activeMobileCategory, setActiveMobileCategory] = useState(null);
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
  const [panelAnimated, setPanelAnimated] = useState(false);
  const { isAuthenticated, openAuthModal } = useAuth();
  const { wishlistCount, cartCount } = useCartWishlist();
  const {
    unreadCount,
    dropdownList,
    markRead,
    markAllRead,
  } = useNotification();
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const {
    categories: navbarCategories,
    subcategoriesByCategoryId,
    loadSubcategoriesForCategory,
    loading: menuLoading,
    subcategoriesLoading,
  } = useNavbarMenu();

  // Expand first category by default so subcategories are visible when menu opens
  const firstCategoryId =
    navbarCategories?.length > 0
      ? (navbarCategories[0]._id ?? navbarCategories[0].id)
      : null;
  const effectiveActiveCategory =
    activeMobileCategory ??
    (firstCategoryId && !menuLoading ? firstCategoryId : null);
  const activeCategoryNameForMenu =
    navbarCategories.find(
      (c) => (c._id ?? c.id) === effectiveActiveCategory,
    )?.name ?? "";

  const closeMenu = () => setMenuOpen(false);
  const closeSearchModal = () => setSearchModalOpen(false);

  const openSearchModal = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

  // When search modal opens: recent = API if logged in, else Redux; always fetch popular
  useEffect(() => {
    if (!searchModalOpen) return;
    setSearchPanelAnimated(false);
    setSearchModalLoading(true);
    const limit = 10;
    const recentPromise = searchKeywordsService
      .getRecent({ limit })
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const list = Array.isArray(data) ? data : [];
        setRecentSearches(list);
        setRecentFromApi(true);
      })
      .catch(() => {
        setRecentSearches(recentFromRedux.map((k) => ({ keyword: k })));
        setRecentFromApi(false);
      });

    const popularPromise = searchKeywordsService
      .getPopular({ limit })
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        setPopularSearches(Array.isArray(data) ? data : []);
      })
      .catch(() => setPopularSearches([]));

    Promise.all([recentPromise, popularPromise]).finally(() =>
      setSearchModalLoading(false),
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSearchPanelAnimated(true));
    });
  }, [searchModalOpen, recentFromRedux]);

  useEffect(() => {
    if (!searchModalOpen) {
      setSearchPanelAnimated(false);
    }
  }, [searchModalOpen]);

  // Keep search bar in sync with URL q (e.g. when on /search?q=...). Clear when leaving search (e.g. back to home).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (location.pathname === ROUTES.SEARCH && q != null && q !== "") {
      setSearchInputValue(decodeURIComponent(q));
    } else if (location.pathname !== ROUTES.SEARCH) {
      setSearchInputValue("");
    }
  }, [location.pathname, location.search]);

  const goToSearch = useCallback(
    (keyword) => {
      const term = keyword != null ? String(keyword).trim() : "";
      if (!term) return;
      closeSearchModal();
      if (!recentFromApi) dispatch(addRecentKeyword(term));
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(term)}`);
    },
    [navigate, recentFromApi, dispatch],
  );

  const removeRecentItem = useCallback(
    (keyword) => {
      const term =
        typeof keyword === "string" ? keyword : (keyword?.keyword ?? "");
      if (!term) return;
      if (recentFromApi) {
        searchKeywordsService
          .deleteKeyword(term)
          .then(() => {
            setRecentSearches((prev) =>
              prev.filter((item) => (item?.keyword ?? item) !== term),
            );
          })
          .catch(() => {});
      } else {
        dispatch(removeRecentKeyword(term));
        setRecentSearches((prev) =>
          prev.filter((item) => (item?.keyword ?? item) !== term),
        );
      }
    },
    [recentFromApi, dispatch],
  );

  const handleSearchModalSubmit = (e) => {
    e.preventDefault();
    goToSearch(
      searchInputValue ||
        e.currentTarget?.querySelector?.('input[name="q"]')?.value,
    );
  };

  const toggleSubcategory = (key) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const headerRef = useRef(null);
  const isHome = location.pathname === "/" || location.pathname === "";
  const handleLogoClick = useCallback(
    (e) => {
      if (!isHome) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [isHome],
  );
  const [scrolled, setScrolled] = useState(false);
  const [searchDropdownTop, setSearchDropdownTop] = useState(0);
  // On non-home pages always use white header; on home use white only when scrolled
  const useWhiteStyle = !isHome || scrolled;

  // Position search dropdown just below header when it opens
  useEffect(() => {
    if (searchModalOpen && headerRef.current) {
      const top = headerRef.current.getBoundingClientRect().bottom;
      setSearchDropdownTop(top);
    }
  }, [searchModalOpen]);

  // When hamburger opens with first category expanded, fetch its subcategories by category
  useEffect(() => {
    if (menuOpen && effectiveActiveCategory) {
      console.log(
        "[Header] menu open, loading subcategories for effectiveActiveCategory",
        { effectiveActiveCategory, menuOpen },
      );
      loadSubcategoriesForCategory(effectiveActiveCategory);
    }
  }, [menuOpen, effectiveActiveCategory, loadSubcategoriesForCategory]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Panel slide-in animation + body scroll lock
  useEffect(() => {
    if (menuOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      setPanelAnimated(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelAnimated(true));
      });
      return () => {
        cancelAnimationFrame(id);
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      };
    } else {
      setPanelAnimated(false);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-colors duration-300 ${
        useWhiteStyle ? "bg-white" : "bg-transparent"
      }`}
    >
      {/* Promo Bar */}
      {/* <div
        className={`font-inter rounded-lg md:rounded-[0.7vw] py-2 md:pt-[0.42vw] md:pb-[0.42vw] mx-3 md:ml-[0.83vw] md:mr-[0.83vw] text-center font-light text-xs sm:text-sm md:text-[1.04vw] px-2 md:px-0 transition-colors duration-300 ${
          useWhiteStyle ? 'bg-black text-white' : 'bg-transparent text-white'
        }`}
      >
        <span className="block truncate">get</span>
      </div> */}

      {/* Main */}
      <div
        className={`px-4 md:px-[1.56vw] py-2 md:py-[0.52vw] transition-colors duration-300 ${
          useWhiteStyle ? "bg-white" : "bg-transparent"
        }`}
      >
        {/* Mobile: row 1 — hamburger, logo, notification, profile; row 2 — location, search */}
        <div className="md:hidden flex flex-col gap-2.5">
          <div className="relative flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`relative z-10 cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                useWhiteStyle
                  ? "text-black hover:bg-gray-100"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <HamburgerIcon
                className={`h-6 w-6 ${useWhiteStyle ? "text-black" : "text-white"}`}
                open={false}
              />
            </button>
            <NavLink
              to={ROUTES.HOME}
              onClick={handleLogoClick}
              className="pointer-events-auto absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex max-w-[calc(100%-8.5rem)] items-center justify-center"
            >
              <img
                src={logoImg}
                alt="KHUSH"
                className={`h-11 w-auto max-h-10 max-w-full object-contain sm:h-12 sm:max-h-11 ${useWhiteStyle ? "" : "brightness-0 invert"}`}
              />
            </NavLink>
            <div className="relative z-10 flex shrink-0 items-center justify-end gap-0.5">
              {isAuthenticated ? (
                <NavLink
                  to={ROUTES.NOTIFICATIONS}
                  className={`cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg relative ${
                    useWhiteStyle
                      ? "text-black hover:opacity-70"
                      : "text-white hover:opacity-70"
                  }`}
                  aria-label="Notifications"
                >
                  <IconBadge count={unreadCount} scrolled={useWhiteStyle}>
                    <NotificationIcon
                      className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </IconBadge>
                </NavLink>
              ) : null}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className={`cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    useWhiteStyle
                      ? "text-black hover:opacity-70"
                      : "text-white hover:opacity-70"
                  }`}
                  aria-label="Account"
                >
                  <ProfileIcon
                    className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.ACCOUNT)}
                  className={`cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    useWhiteStyle
                      ? "text-black hover:opacity-70"
                      : "text-white hover:opacity-70"
                  }`}
                  aria-label="Account – sign in"
                >
                  <ProfileIcon
                    className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
                  />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LocationPicker
              scrolled={useWhiteStyle}
              className="flex min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={openSearchModal}
              className={`cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                useWhiteStyle
                  ? "text-black hover:bg-gray-100"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label="Search"
            >
              <SearchIcon
                className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
              />
            </button>
          </div>
        </div>

        {/* Desktop/Tablet Layout - Single Row (for screens >= 768px) */}
        <div className="hidden md:flex flex-row items-center gap-0">
          {/* Left: Menu (Hamburger) + Location */}
          <div className="flex shrink-0 items-center gap-[1.04vw]">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`cursor-pointer font-inter flex items-center gap-[0.42vw] text-[0.83vw] ${
                useWhiteStyle
                  ? "text-black hover:opacity-70"
                  : "text-white hover:opacity-70"
              }`}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <HamburgerIcon
                className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
                open={false}
              />
              <span>Menu</span>
            </button>

            <LocationPicker scrolled={useWhiteStyle} compact />
          </div>

          {/* Center: Logo + taglines */}
          <div className="flex flex-1 items-center justify-center">
            <NavLink
              to={ROUTES.HOME}
              onClick={handleLogoClick}
              className="cursor-pointer flex flex-col items-center justify-center gap-[0.26vw]"
            >
              <img
                src={logoImg}
                alt="KHUSH"
                className={`h-12 md:h-14 lg:h-16 w-auto object-contain ${useWhiteStyle ? "" : "brightness-0 invert"}`}
              />
            </NavLink>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-[0.83vw]">
            <form
              action={ROUTES.SEARCH}
              method="get"
              onSubmit={() => closeSearchModal()}
              className={`flex items-center gap-[4.63vw] rounded-full px-[1.04vw] py-[0.63vw] ${
                useWhiteStyle ? "bg-[#F5F5F5]" : "bg-white/10"
              }`}
            >
              <input
                type="search"
                name="q"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Find Your Choice"
                onFocus={openSearchModal}
                onClick={openSearchModal}
                className={`font-inter w-full bg-transparent text-[0.83vw] focus:outline-none ${
                  useWhiteStyle
                    ? "text-black placeholder:text-[#636363]"
                    : "text-white placeholder:text-white/80"
                }`}
              />
              <button
                type="submit"
                className="cursor-pointer shrink-0"
                aria-label="Search"
              >
                <SearchIcon
                  className={`h-5 w-5 ${useWhiteStyle ? "text-black" : "text-white"}`}
                />
              </button>
            </form>

            <div className="flex items-center gap-[1.3vw]">
              {isAuthenticated ? (
                <NavLink
                  to={ROUTES.WISHLIST}
                  className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Wishlist"
                >
                  <IconBadge count={wishlistCount} scrolled={useWhiteStyle}>
                    <HeartIcon
                      className={`h-[1.87vw] w-[1.87vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </IconBadge>
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.WISHLIST)}
                  className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Wishlist – sign in"
                >
                  <IconBadge count={wishlistCount} scrolled={useWhiteStyle}>
                    <HeartIcon
                      className={`h-[1.87vw] w-[1.87vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </IconBadge>
                </button>
              )}

              {isAuthenticated ? (
                <NavLink
                  to={ROUTES.CART}
                  className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Cart"
                >
                  <IconBadge count={cartCount} scrolled={useWhiteStyle}>
                    <CartIcon
                      className={`h-[1.87vw] w-[1.87vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </IconBadge>
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.CART)}
                  className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Cart – sign in"
                >
                  <IconBadge count={cartCount} scrolled={useWhiteStyle}>
                    <CartIcon
                      className={`h-[1.87vw] w-[1.87vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </IconBadge>
                </button>
              )}

              {isAuthenticated ? (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotificationDropdownOpen((prev) => !prev)}
                      className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                      aria-label="Notifications"
                      aria-expanded={notificationDropdownOpen}
                    >
                      <IconBadge count={unreadCount} scrolled={useWhiteStyle}>
                        <NotificationIcon
                          className={`h-[1.04vw] w-[1.06vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                        />
                      </IconBadge>
                    </button>
                    {notificationDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          aria-hidden
                          onClick={() => setNotificationDropdownOpen(false)}
                        />
                        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-96 overflow-auto rounded-xl bg-white shadow-lg border border-gray-200 py-2">
                          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                            <span className="font-semibold text-gray-900">Notifications</span>
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={() => { markAllRead(); setNotificationDropdownOpen(false); }}
                                className="text-sm text-gray-600 hover:text-gray-900"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-64 overflow-auto">
                            {dropdownList.length === 0 ? (
                              <p className="px-3 py-4 text-sm text-gray-500">No notifications</p>
                            ) : (
                              dropdownList.map((n) => (
                                <button
                                  key={n._id}
                                  type="button"
                                  onClick={() => { markRead(n._id); setNotificationDropdownOpen(false); navigate(ROUTES.NOTIFICATIONS); }}
                                  className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}
                                >
                                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                                  {n.body ? <p className="text-xs text-gray-600 truncate mt-0.5">{n.body}</p> : null}
                                </button>
                              ))
                            )}
                          </div>
                          <NavLink
                            to={ROUTES.NOTIFICATIONS}
                            onClick={() => setNotificationDropdownOpen(false)}
                            className="block px-3 py-2 text-sm text-center text-gray-600 hover:bg-gray-50 font-medium"
                          >
                            See all
                          </NavLink>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                    aria-label="Account"
                  >
                    <ProfileIcon
                      className={`h-[1.04vw] w-[1.04vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.ACCOUNT)}
                  className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Account – sign in"
                >
                  <ProfileIcon
                    className={`h-[1.04vw] w-[1.04vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search dropdown: curved panel below header */}
        {searchModalOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-pointer bg-black/20  transition-opacity duration-300"
              onClick={closeSearchModal}
              aria-hidden
            />
            <div
              className="fixed left-4 right-4 z-50 rounded-2xl shadow-2xl flex flex-col bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300 ease-out"
              style={{
                top: searchDropdownTop + 8,
                maxHeight: `calc(100vh - ${searchDropdownTop}px - 1.5rem)`,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Search - recent and popular"
            >
              {/* Search row: input + close */}
              <div className="flex items-center gap-3 shrink-0 p-4 pb-3">
                <form
                  onSubmit={handleSearchModalSubmit}
                  className="flex-1 min-w-0 flex items-center gap-2 rounded-xl bg-black/10 backdrop-blur-sm px-3 py-2.5"
                >
                  <SearchIcon className="h-5 w-5 text-gray-400 shrink-0" />
                  <input
                    type="search"
                    name="q"
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                    placeholder="Search T-Shirts"
                    className="font-inter flex-1 bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
                    autofocus
                  />
                </form>
                  {/* <button
                  type="button"
                  onClick={closeSearchModal}
                  className="cursor-pointer shrink-0 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon className="h-6 w-6" /> 
                </button>   */}
              </div>

              {/* Recent & Popular in scrollable area */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                {searchModalLoading ? (
                  <div className="font-inter text-sm text-gray-400 py-6">
                    Loading…
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <h3 className="font-inter text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
                        Recent Searches
                      </h3>
                      {recentSearches.length === 0 ? (
                        <p className="font-inter text-sm text-gray-500">
                          No recent searches
                        </p>
                      ) : (
                        <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-1">
                          {recentSearches.map((item) => {
                            const keyword = item?.keyword ?? item;
                            const text =
                              typeof keyword === "string"
                                ? keyword
                                : (keyword?.keyword ?? "");
                            if (!text) return null;
                            return (
                              <span
                                key={text}
                                className="font-inter inline-flex items-center gap-1.5 shrink-0 rounded-full bg-white/10 backdrop-blur-sm pl-3 pr-1.5 py-2 text-sm text-gray-200"
                              >
                                <button
                                  type="button"
                                  onClick={() => goToSearch(text)}
                                  className="cursor-pointer hover:text-white transition-colors"
                                >
                                  {text}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeRecentItem(text);
                                  }}
                                  className="cursor-pointer text-gray-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                  aria-label={`Remove ${text}`}
                                >
                                  {/* <span aria-hidden>×</span> */}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-inter text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
                        Popular Searches
                      </h3>
                      {popularSearches.length === 0 ? (
                        <p className="font-inter text-sm text-gray-500">
                          No popular searches
                        </p>
                      ) : (
                        <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-1">
                          {popularSearches.map((item) => {
                            const keyword = item?.keyword ?? item;
                            const text =
                              typeof keyword === "string"
                                ? keyword
                                : (keyword?.keyword ?? "");
                            if (!text) return null;
                            return (
                              <button
                                key={text}
                                type="button"
                                onClick={() => goToSearch(text)}
                                className="cursor-pointer font-inter shrink-0 rounded-full bg-white/10 backdrop-blur-sm px-3 py-2 text-sm text-gray-200 hover:bg-white/20 hover:text-white transition-colors"
                              >
                                {text}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Full-screen hamburger menu modal */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-pointer bg-black/30 transition-opacity duration-300"
              onClick={closeMenu}
              aria-hidden
            />

            <div
              className="fixed left-0 top-0 bottom-0 z-50 w-[80vw] min-w-[280px] max-w-[400px] bg-white flex flex-col transition-transform duration-300 ease-out"
              style={{
                transform: panelAnimated
                  ? "translateX(0)"
                  : "translateX(-100%)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Close Button */}
              <div className="flex justify-end shrink-0 pt-4 pr-4 md:pt-6 md:pr-6">
                <button
                  type="button"
                  onClick={closeMenu}
                  className="cursor-pointer flex h-12 w-12 items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <CloseIcon className="h-7 w-7" />
                </button>
              </div>

              {/* ========================= */}
              {/* ✅ FIXED CATEGORY SCROLL */}
              {/* ========================= */}

              <div
                className="shrink-0 w-full overflow-x-auto scrollbar-hide border-b border-gray-200"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex w-max gap-6 md:gap-10 px-4 pb-3">
                  {navbarCategories.map((cat) => {
                    const categoryId = cat._id ?? cat.id;
                    const categoryName = (cat.name ?? "").toUpperCase();
                    const isActive = effectiveActiveCategory === categoryId;

                    return (
                      <button
                        key={categoryId}
                        type="button"
                        onClick={() => {
                          setActiveMobileCategory(categoryId);
                          loadSubcategoriesForCategory(categoryId);
                        }}
                        className="cursor-pointer relative shrink-0 font-inter text-sm md:text-base font-medium tracking-wide pb-2 transition-colors"
                      >
                        <span
                          className={
                            isActive
                              ? "text-black"
                              : "text-gray-400 hover:text-gray-600"
                          }
                        >
                          {categoryName || "Category"}
                        </span>

                        {isActive && (
                          <>
                            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-black" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 flex justify-center">
                              <DiamondIcon className="h-1.5 w-1.5 text-black" />
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}

                  {!menuLoading && navbarCategories.length === 0 && (
                    <span className="font-inter text-sm text-gray-400 shrink-0">
                      No categories
                    </span>
                  )}
                </div>
              </div>

              {/* ========================= */}
              {/* Subcategories */}
              {/* ========================= */}

              <nav className="flex-1 overflow-y-auto">
                {menuLoading ? (
                  <div className="px-4 py-6 font-inter text-sm text-gray-500">
                    Loading menu…
                  </div>
                ) : effectiveActiveCategory ? (
                  subcategoriesLoading?.[effectiveActiveCategory] ? (
                    <div className="px-4 py-6 font-inter text-sm text-gray-500">
                      Loading…
                    </div>
                  ) : (
                    <ul className="py-2">
                      {(
                        subcategoriesByCategoryId[effectiveActiveCategory] ?? []
                      ).map((sub, subIdx) => {
                        const subId = sub._id ?? sub.id ?? `sub-${subIdx}`;
                        const subName = sub.name ?? sub.label ?? "Subcategory";

                        return (
                          <li key={subId}>
                            <NavLink
                              to={getSearchUrl({
                                categoryId: effectiveActiveCategory,
                                subcategoryId: subId,
                                categoryName: activeCategoryNameForMenu,
                                subcategoryName: subName,
                              })}
                              onClick={closeMenu}
                              className="cursor-pointer font-inter flex items-center w-full text-left py-4 px-4 text-black text-sm md:text-base font-medium hover:bg-gray-50 transition-colors"
                            >
                              {subName}
                            </NavLink>
                          </li>
                        );
                      })}

                      <li className="border-t border-gray-200 mt-1">
                        <NavLink
                          to={getSearchUrl({
                            categoryId: effectiveActiveCategory,
                            categoryName: activeCategoryNameForMenu || undefined,
                          })}
                          onClick={closeMenu}
                          className="cursor-pointer font-inter flex items-center w-full text-left py-4 px-4 text-black text-sm md:text-base font-semibold uppercase tracking-wide hover:bg-gray-50 transition-colors"
                        >
                          View all
                          {activeCategoryNameForMenu
                            ? ` in ${activeCategoryNameForMenu}`
                            : ""}
                        </NavLink>
                      </li>
                    </ul>
                  )
                ) : (
                  <div className="px-4 py-6 font-inter text-sm text-gray-500">
                    Select a category above.
                  </div>
                )}
              </nav>
            </div>
          </>
        )}

        {/* Profile slide-over modal */}
        <ProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
      </div>
    </header>
  );
}
