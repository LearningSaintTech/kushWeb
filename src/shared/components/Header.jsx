import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { ROUTES, getSearchPath } from "../../utils/constants";
import { getPublicImageUrl } from "../../services/config.js";
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

function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getSubcategoryIconUrl(sub) {
  if (!sub) return "";
  if (sub.iconUrl) return getPublicImageUrl(sub.iconUrl);
  if (sub.iconKey) return getPublicImageUrl(sub.iconKey);
  return "";
}

function SubcategoryMenuIcon({ sub }) {
  const src = getSubcategoryIconUrl(sub);
  if (!src) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-50"
        aria-hidden
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-5 w-5 shrink-0 object-contain"
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden
    />
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

function ReferEarnIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5.64 25.8468V13.6401H5.384C4.99289 13.6401 4.66444 13.5067 4.39867 13.2401C4.13289 12.9734 4 12.6459 4 12.2574V9.12808C4 8.73697 4.13289 8.40808 4.39867 8.14142C4.66444 7.87475 4.99333 7.74231 5.38533 7.74408H10.856C10.5911 7.50942 10.408 7.22942 10.3067 6.90408C10.2053 6.57964 10.1547 6.24408 10.1547 5.89742C10.1547 5.00853 10.4622 4.25653 11.0773 3.64142C11.6924 3.02631 12.4444 2.71875 13.3333 2.71875C13.8444 2.71875 14.3138 2.83875 14.7413 3.07875C15.168 3.31875 15.5364 3.63119 15.8467 4.01608C16.156 3.62586 16.524 3.31208 16.9507 3.07475C17.3773 2.83742 17.8467 2.71875 18.3587 2.71875C19.2476 2.71875 19.9996 3.02631 20.6147 3.64142C21.2298 4.25653 21.5378 5.00853 21.5387 5.89742C21.5387 6.24408 21.4862 6.57875 21.3813 6.90142C21.2764 7.22408 21.0947 7.50497 20.836 7.74408H26.616C27.0071 7.74408 27.3356 7.87697 27.6013 8.14275C27.8671 8.40853 28 8.73742 28 9.12942V12.2561C28 12.6472 27.8671 12.9761 27.6013 13.2428C27.3356 13.5094 27.0067 13.6423 26.6147 13.6414H26.3587V25.8468C26.3587 26.4423 26.1489 26.9503 25.7293 27.3708C25.3098 27.7903 24.8018 28.0001 24.2053 28.0001H7.79467C7.19822 28.0001 6.69022 27.7903 6.27067 27.3708C5.85111 26.9512 5.64133 26.4428 5.64133 25.8454M17.0507 4.58808C16.6924 4.94631 16.5133 5.38275 16.5133 5.89742C16.5133 6.41208 16.6924 6.84853 17.0507 7.20675C17.4089 7.56497 17.8449 7.74408 18.3587 7.74408C18.8724 7.74408 19.3089 7.56497 19.668 7.20675C20.0271 6.84853 20.2062 6.41208 20.2053 5.89742C20.2044 5.38275 20.0253 4.94631 19.668 4.58808C19.3098 4.23075 18.8733 4.05208 18.3587 4.05208C17.844 4.05208 17.408 4.23075 17.0507 4.58808ZM11.488 5.89742C11.488 6.41208 11.6667 6.84853 12.024 7.20675C12.3822 7.56497 12.8187 7.74408 13.3333 7.74408C13.848 7.74408 14.2844 7.56497 14.6427 7.20675C15.0009 6.84853 15.18 6.41208 15.18 5.89742C15.18 5.38275 15.0009 4.94631 14.6427 4.58808C14.2844 4.23164 13.848 4.05342 13.3333 4.05342C12.8187 4.05342 12.3822 4.23208 12.024 4.58942C11.6658 4.94675 11.4867 5.38319 11.4867 5.89875M5.33333 9.07742V12.3067H15.3333V9.07742H5.33333ZM15.3333 26.6667V13.6401H6.97333V25.8468C6.97333 26.0859 7.05067 26.2823 7.20533 26.4361C7.35911 26.5899 7.55556 26.6667 7.79467 26.6667H15.3333ZM16.6667 26.6667H24.2053C24.4444 26.6667 24.6409 26.5899 24.7947 26.4361C24.9484 26.2823 25.0253 26.0859 25.0253 25.8468V13.6401H16.6667V26.6667ZM26.6667 12.3067V9.07875H16.6667V12.3067H26.6667Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBadge({ count, children, scrolled, mobileDark = false }) {
  const darkBadge = mobileDark || scrolled;
  return (
    <span className="relative inline-block">
      {children}
      {count > 0 && (
        <span
          className={`font-inter absolute -right-1 -top-1 md:-right-[0.52vw] md:-top-[0.52vw] flex h-4 w-4 md:h-[0.83vw] md:min-w-[0.83vw] items-center justify-center rounded-full px-0.5 md:px-[0.21vw] text-[10px] md:text-[0.52vw] font-medium leading-none ${
            darkBadge ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}

function KhushMobileLogo({ className = "h-9 w-9" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M9.86179 8.1033L17.0941 7.9089C17.8917 7.88925 19.4662 7.79205 20.0497 7.20887C20.1863 7.07236 20.2639 6.9566 20.2049 6.74255L20.3218 6.6257L22.8688 9.17136L22.7519 9.28821C19.4083 8.08364 15.9282 8.5303 12.4284 8.56962C17.2886 12.5721 8.30694 21.394 11.3587 24.4453C11.9805 25.0667 12.895 25.2807 13.7309 25.0667L13.7888 25.2414C12.5836 25.5134 11.3194 25.1049 10.4638 24.2509C6.16752 19.9568 14.7798 11.3479 12.1356 8.70504L12.0187 8.58818L9.25755 8.70504L3.5801 14.3795C3.05563 14.9037 2.86114 15.7206 3.11354 16.4392L3.01629 16.5364L0.0803223 13.602L0.17757 13.5048C0.916207 13.6992 1.73242 13.5048 2.27766 12.9609L13.0676 2.17653C13.6315 1.61302 13.8259 0.874763 13.5735 0.116854L13.6905 0L16.6264 2.93444L16.5095 3.05129C15.8288 2.79902 15.0126 2.9541 14.4881 3.4783L9.8607 8.1033H9.86179Z"
        fill="currentColor"
      />
      <path
        d="M8.10752 29.8889L7.91302 22.6604C7.89335 21.8631 7.79611 20.2894 7.21263 19.7063C7.07605 19.5698 6.96023 19.4922 6.74606 19.5512L6.62915 19.4343L9.17614 16.8887L9.29305 17.0055C8.08785 20.3473 8.53475 23.8256 8.57408 27.3236C12.5787 22.466 21.4052 31.4429 24.458 28.3927C25.0798 27.7713 25.2939 26.8573 25.0798 26.0218L25.2546 25.9639C25.5267 27.1685 25.118 28.432 24.2635 29.2872C19.9672 33.5812 11.3538 24.9734 8.70957 27.6163L8.59265 27.7331L8.70957 30.4928L14.387 36.1673C14.9115 36.6915 15.7288 36.8859 16.4478 36.6336L16.545 36.7308L13.609 39.6653L13.5118 39.5681C13.7063 38.8298 13.5118 38.014 12.9677 37.4691L2.17766 26.6847C1.61385 26.1212 0.875219 25.9268 0.116915 26.1791L0 26.0622L2.93597 23.1278L3.05288 23.2446C2.80048 23.925 2.95564 24.7408 3.48011 25.265L8.10752 29.89V29.8889Z"
        fill="currentColor"
      />
      <path
        d="M29.9047 31.6435L22.6724 31.8379C21.8748 31.8576 20.3002 31.9548 19.7168 32.5379C19.5802 32.6744 19.5026 32.7902 19.5616 33.0042L19.4447 33.1211L16.8977 30.5754L17.0146 30.4586C20.3581 31.6632 23.8383 31.2165 27.338 31.1772C22.4779 27.1747 31.4595 18.3528 28.4078 15.3015C27.786 14.6801 26.8715 14.4661 26.0356 14.6801L25.9777 14.5054C27.1829 14.2334 28.4471 14.6419 29.3026 15.4959C33.599 19.79 24.9866 28.3989 27.6309 31.0418L27.7478 31.1586L30.5089 31.0418L36.1864 25.3673C36.7109 24.8431 36.9054 24.0262 36.6529 23.3076L36.7502 23.2104L39.6862 26.1448L39.5889 26.242C38.8503 26.0476 38.0341 26.242 37.4888 26.7859L26.6988 37.5703C26.135 38.1338 25.9405 38.872 26.1929 39.6299L26.076 39.7468L23.14 36.8124L23.257 36.6955C23.9377 36.9478 24.7539 36.7927 25.2784 36.2685L29.9058 31.6435H29.9047Z"
        fill="currentColor"
      />
      <path
        d="M31.6596 9.85645L31.854 17.085C31.8737 17.8822 31.971 19.4559 32.5544 20.0391C32.691 20.1756 32.8069 20.2531 33.021 20.1942L33.1379 20.311L30.5909 22.8567L30.474 22.7398C31.6792 19.398 31.2323 15.9197 31.193 12.4218C27.1884 17.2794 18.3619 8.30241 15.309 11.3526C14.6873 11.974 14.4732 12.8881 14.6873 13.7235L14.5125 13.7814C14.2404 12.5768 14.6491 11.3133 15.5035 10.4582C19.7999 6.1641 28.4133 14.7719 31.0575 12.1291L31.1744 12.0122L31.0575 9.25253L25.3801 3.57804C24.8556 3.05383 24.0383 2.85944 23.3193 3.11171L23.2221 3.01452L26.158 0.0800781L26.2553 0.177272C26.0608 0.915524 26.2553 1.73131 26.7994 2.27627L37.5894 13.0606C38.1532 13.6242 38.8919 13.8185 39.6502 13.5663L39.7671 13.6831L36.8311 16.6176L36.7142 16.5007C36.9666 15.8203 36.8114 15.0046 36.287 14.4804L31.6596 9.85536V9.85645Z"
        fill="currentColor"
      />
    </svg>
  );
}

const mobileIconBtn =
  "cursor-pointer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-black hover:opacity-70";

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
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const menuProfileName =
    user?.name ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    user?.phone ??
    "Account";
  const menuProfileImage =
    user?.profileImage ?? user?.avatar ?? user?.image ?? user?.photo ?? null;
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
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-colors duration-300 max-md:bg-white ${
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
        {/* Mobile: row 1 — menu, bell, logo, profile, cart, wishlist; row 2 — search + location */}
        <div className="md:hidden flex flex-col gap-2.5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className={mobileIconBtn}
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <HamburgerIcon className="h-6 w-6 text-black" open={false} />
              </button>
              {isAuthenticated ? (
                <NavLink
                  to={ROUTES.NOTIFICATIONS}
                  className={`${mobileIconBtn} relative`}
                  aria-label="Notifications"
                >
                  <IconBadge count={unreadCount} scrolled mobileDark>
                    <NotificationIcon className="h-5 w-5 text-black" />
                  </IconBadge>
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.NOTIFICATIONS)}
                  className={`${mobileIconBtn} relative`}
                  aria-label="Notifications – sign in"
                >
                  <NotificationIcon className="h-5 w-5 text-black" />
                </button>
              )}
            </div>

            <NavLink
              to={ROUTES.HOME}
              onClick={handleLogoClick}
              className="flex items-center justify-center text-black"
              aria-label="KHUSH home"
            >
              <KhushMobileLogo className="h-9 w-9 sm:h-10 sm:w-10" />
            </NavLink>

            <div className="flex items-center justify-end gap-0.5">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className={mobileIconBtn}
                  aria-label="Account"
                >
                  <ProfileIcon className="h-5 w-5 text-black" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.ACCOUNT)}
                  className={mobileIconBtn}
                  aria-label="Account – sign in"
                >
                  <ProfileIcon className="h-5 w-5 text-black" />
                </button>
              )}
              <NavLink to={ROUTES.CART} className={mobileIconBtn} aria-label="Cart">
                <IconBadge count={cartCount} scrolled mobileDark>
                  <CartIcon className="h-5 w-5 text-black" />
                </IconBadge>
              </NavLink>
              <NavLink to={ROUTES.WISHLIST} className={mobileIconBtn} aria-label="Wishlist">
                <IconBadge count={wishlistCount} scrolled mobileDark>
                  <HeartIcon className="h-5 w-5 text-black" />
                </IconBadge>
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={handleSearchModalSubmit}
              className="flex min-w-0 flex-1 items-center rounded-full border border-gray-200 bg-white px-4 py-2.5"
            >
              <input
                type="search"
                name="q"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Find Your Choice"
                onFocus={openSearchModal}
                onClick={openSearchModal}
                className="font-inter w-full min-w-0 bg-transparent text-sm text-black placeholder:text-[#9E9E9E] focus:outline-none"
                aria-label="Search products"
              />
            </form>
            <LocationPicker scrolled iconOnly className="shrink-0" />
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
              <NavLink
                to={ROUTES.REFER_EARN}
                className={`cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                aria-label="Refer and Earn"
              >
                <ReferEarnIcon
                  className={`h-[1.56vw] w-[1.56vw] ${useWhiteStyle ? "text-black" : "text-white"}`}
                />
              </NavLink>
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
              {/* Top bar (Login/Signup + FAQs + Close) */}
              <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      if (isAuthenticated) navigate(ROUTES.PROFILE_UPDATE);
                      else openAuthModal(ROUTES.PROFILE_UPDATE);
                    }}
                    className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-50 transition-colors"
                    aria-label={isAuthenticated ? "Account" : "Login or Signup"}
                  >
                    <span className="flex h-9 w-9 shrink-0  items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white text-black">
                      {isAuthenticated && menuProfileImage ? (
                        <img
                          src={menuProfileImage}
                          alt={menuProfileName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ProfileIcon className="h-5 w-5 text-black" />
                      )}
                    </span>
                    <span className="min-w-0 font-inter text-[15px] font-semibold text-black truncate">
                      {isAuthenticated ? menuProfileName : "Login/Signup"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <NavLink
                      to={ROUTES.FAQS}
                      onClick={closeMenu}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 font-inter text-[13px] font-semibold text-black hover:bg-gray-50 transition-colors"
                      aria-label="FAQs"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] leading-none">
                        i
                      </span>
                      FAQs
                    </NavLink>

                    <button
                      type="button"
                      onClick={closeMenu}
                      className="cursor-pointer flex h-10 w-10 items-center justify-center text-black hover:bg-gray-50 rounded-xl transition-colors"
                      aria-label="Close menu"
                    >
                      <CloseIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
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
                          <li key={subId} className="border-b border-gray-100 last:border-b-0">
                            <NavLink
                              to={getSearchUrl({
                                categoryId: effectiveActiveCategory,
                                subcategoryId: subId,
                                categoryName: activeCategoryNameForMenu,
                                subcategoryName: subName,
                              })}
                              onClick={closeMenu}
                              className="cursor-pointer font-inter flex items-center gap-3 w-full text-left py-4 px-4 text-black text-sm md:text-base font-medium hover:bg-gray-50 transition-colors"
                            >
                              <SubcategoryMenuIcon sub={sub} />
                              <span className="min-w-0 flex-1">{subName}</span>
                              <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
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
