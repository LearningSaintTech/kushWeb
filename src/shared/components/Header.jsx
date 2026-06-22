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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 28"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M29.1615 16.8944C28.8599 16.6621 28.5086 16.5028 28.1351 16.4289C27.7616 16.355 27.3761 16.3685 27.0087 16.4684L21.0583 17.8308C21.3152 17.3915 21.4506 16.8917 21.4505 16.3827C21.4505 15.6146 21.1453 14.8779 20.6022 14.3348C20.0591 13.7917 19.3224 13.4865 18.5543 13.4865H12.5133C12.0694 13.4852 11.6296 13.5719 11.2195 13.7418C10.8093 13.9117 10.437 14.1612 10.124 14.4761L7.25193 17.3481H3.59067C3.20661 17.3481 2.83828 17.5007 2.56671 17.7722C2.29514 18.0438 2.14258 18.4121 2.14258 18.7962V23.6232C2.14258 24.0072 2.29514 24.3755 2.56671 24.6471C2.83828 24.9187 3.20661 25.0713 3.59067 25.0713H16.1408C16.1815 25.0715 16.222 25.0667 16.2615 25.0568L23.9846 23.126C24.0092 23.1195 24.0334 23.1114 24.057 23.1018L28.7416 21.1059L28.7682 21.0938C29.1456 20.9052 29.4688 20.6235 29.7073 20.2755C29.9458 19.9274 30.0918 19.5243 30.1315 19.1042C30.1713 18.6841 30.1034 18.2609 29.9343 17.8742C29.7653 17.4876 29.5006 17.1504 29.1652 16.8944H29.1615ZM3.10797 23.6232V18.7962C3.10797 18.6682 3.15883 18.5454 3.24935 18.4549C3.33987 18.3643 3.46265 18.3135 3.59067 18.3135H6.96955V24.1059H3.59067C3.46265 24.1059 3.33987 24.055 3.24935 23.9645C3.15883 23.874 3.10797 23.7512 3.10797 23.6232ZM28.3446 20.2238L23.7095 22.1992L16.0817 24.1059H7.93494V18.0311L10.807 15.1591C11.0305 14.9342 11.2964 14.7559 11.5893 14.6345C11.8822 14.5131 12.1963 14.4511 12.5133 14.4519H18.5543C19.0664 14.4519 19.5575 14.6553 19.9196 15.0174C20.2816 15.3795 20.4851 15.8706 20.4851 16.3827C20.4851 16.8948 20.2816 17.3859 19.9196 17.748C19.5575 18.1101 19.0664 18.3135 18.5543 18.3135H15.1754C15.0474 18.3135 14.9246 18.3643 14.8341 18.4549C14.7436 18.5454 14.6927 18.6682 14.6927 18.7962C14.6927 18.9242 14.7436 19.047 14.8341 19.1375C14.9246 19.228 15.0474 19.2789 15.1754 19.2789H19.037C19.0735 19.279 19.11 19.2749 19.1456 19.2668L27.2308 17.4072H27.2501C27.6124 17.3112 27.9974 17.3523 28.3312 17.5227C28.665 17.6932 28.9241 17.9809 29.0588 18.3307C29.1934 18.6805 29.1941 19.0677 29.0607 19.418C28.9274 19.7683 28.6693 20.0569 28.3361 20.2286L28.3446 20.2238ZM21.4505 10.5903C21.8066 10.5909 22.1611 10.5422 22.504 10.4455C22.6682 11.2019 23.056 11.8914 23.6169 12.4247C24.1778 12.958 24.8861 13.3104 25.6498 13.4362C26.4134 13.562 27.1973 13.4555 27.8997 13.1304C28.6021 12.8052 29.1905 12.2766 29.5888 11.6129C29.987 10.9492 30.1766 10.1812 30.133 9.40847C30.0894 8.63572 29.8146 7.89391 29.3442 7.27926C28.8739 6.6646 28.2297 6.20547 27.4952 5.96142C26.7607 5.71737 25.9698 5.69966 25.2252 5.91059C25.0708 5.19849 24.7181 4.5446 24.2078 4.02447C23.6975 3.50434 23.0505 3.13918 22.3415 2.97121C21.6325 2.80323 20.8904 2.83927 20.201 3.07518C19.5116 3.31109 18.903 3.73724 18.4456 4.30438C17.9881 4.87152 17.7004 5.55652 17.6158 6.28023C17.5312 7.00394 17.653 7.73683 17.9673 8.39422C18.2815 9.05161 18.7754 9.60667 19.3917 9.99529C20.0081 10.3839 20.7218 10.5902 21.4505 10.5903ZM29.1736 9.62495C29.1736 10.1978 29.0038 10.7577 28.6855 11.234C28.3673 11.7103 27.915 12.0815 27.3858 12.3007C26.8565 12.5199 26.2742 12.5772 25.7124 12.4655C25.1506 12.3537 24.6346 12.0779 24.2295 11.6729C23.8245 11.2678 23.5486 10.7518 23.4369 10.19C23.3251 9.62816 23.3825 9.04583 23.6017 8.51663C23.8209 7.98742 24.1921 7.5351 24.6684 7.21686C25.1447 6.89862 25.7046 6.72876 26.2774 6.72876C27.0455 6.72876 27.7822 7.0339 28.3253 7.57704C28.8685 8.12018 29.1736 8.85683 29.1736 9.62495ZM21.4505 3.83258C22.1446 3.83251 22.8157 4.08175 23.3415 4.53491C23.8673 4.98808 24.2129 5.61502 24.3153 6.30158C23.7607 6.62788 23.2965 7.08756 22.9648 7.63887C22.6331 8.19018 22.4444 8.81564 22.4159 9.45842C22.0181 9.59945 21.5944 9.65186 21.1742 9.61198C20.7541 9.57211 20.3478 9.4409 19.9837 9.22754C19.6196 9.01419 19.3065 8.72385 19.0664 8.37683C18.8263 8.02982 18.6649 7.63451 18.5935 7.21859C18.5221 6.80266 18.5425 6.37617 18.6532 5.96895C18.7639 5.56172 18.9623 5.18362 19.2344 4.86108C19.5066 4.53855 19.8459 4.27939 20.2287 4.10173C20.6115 3.92407 21.0285 3.83221 21.4505 3.83258Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.386158"
      />
    </svg>
  );
}

function IconBadge({ count, children, scrolled, mobileDark = false }) {
  const darkBadge = mobileDark || scrolled;
  return (
    <span className="relative inline-flex items-center justify-center">
      {children}
      {count > 0 && (
        <span
          className={`font-inter absolute -right-1 -top-1 md:-right-0.5 md:-top-0.5 flex h-4 w-4 md:h-3.5 md:min-w-[0.875rem] items-center justify-center rounded-full px-0.5 text-[10px] md:text-[9px] font-medium leading-none ${
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

const desktopNavIconSize = "h-5 w-5";
const desktopNavIconBtn =
  "flex h-6 w-6 shrink-0 items-center justify-center";

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

            <div className="flex items-center gap-3 md:gap-4">
              <NavLink
                to={ROUTES.REFER_EARN}
                className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                aria-label="Refer and Earn"
              >
                <ReferEarnIcon
                  className={`${desktopNavIconSize} shrink-0 ${useWhiteStyle ? "text-black" : "text-white"}`}
                />
              </NavLink>
              <NavLink
                to={ROUTES.WISHLIST}
                className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                aria-label="Wishlist"
              >
                <IconBadge count={wishlistCount} scrolled={useWhiteStyle}>
                  <HeartIcon
                    className={`${desktopNavIconSize} ${useWhiteStyle ? "text-black" : "text-white"}`}
                  />
                </IconBadge>
              </NavLink>

              <NavLink
                to={ROUTES.CART}
                className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                aria-label="Cart"
              >
                <IconBadge count={cartCount} scrolled={useWhiteStyle}>
                  <CartIcon
                    className={`${desktopNavIconSize} ${useWhiteStyle ? "text-black" : "text-white"}`}
                  />
                </IconBadge>
              </NavLink>

              {isAuthenticated ? (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotificationDropdownOpen((prev) => !prev)}
                      className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                      aria-label="Notifications"
                      aria-expanded={notificationDropdownOpen}
                    >
                      <IconBadge count={unreadCount} scrolled={useWhiteStyle}>
                        <NotificationIcon
                          className={`${desktopNavIconSize} ${useWhiteStyle ? "text-black" : "text-white"}`}
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
                    className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                    aria-label="Account"
                  >
                    <ProfileIcon
                      className={`${desktopNavIconSize} ${useWhiteStyle ? "text-black" : "text-white"}`}
                    />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal(ROUTES.ACCOUNT)}
                  className={`${desktopNavIconBtn} cursor-pointer ${useWhiteStyle ? "text-black hover:opacity-70" : "text-white hover:opacity-70"}`}
                  aria-label="Account – sign in"
                >
                  <ProfileIcon
                    className={`${desktopNavIconSize} ${useWhiteStyle ? "text-black" : "text-white"}`}
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
              className="fixed left-0 top-0 uppercase bottom-0 z-50 w-[80vw] min-w-[280px] max-w-[400px] bg-white flex flex-col transition-transform duration-300 ease-out"
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
