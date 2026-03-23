import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import logoImg from "../../assets/images/navBar/SVG.svg";
import khushDressImg from "../../assets/images/footer/khushDress.png";
import {
  categoriesService,
  subcategoriesService,
} from "../../services/categories.service.js";
import {
  FaFacebookF,
  FaInstagram,
  FaPinterest,
  FaApple,
  FaGooglePlay,
} from "react-icons/fa";
// import { FaXTwitter } from "react-icons/fa6";
/** Static fallback when API returns no footer data (matches your copy). */
const FALLBACK_SECTIONS = [
  {
    title: "Men's Collection",
    items: [
      "Outerwear",
      "Suits & Blazers",
      "T-Shirts & Tanks",
      "Jeans",
      "Shorts",
      "Underwear & Socks",
      "Pants",
    ],
  },
  {
    title: "Women's Collection",
    items: [
      "Dresses",
      "Tops & Tees",
      "Jeans",
      "Skirts",
      "Lingerie",
      "Sweaters",
      "Blouses",
    ],
  },
  {
    title: "Unisex Collection",
    items: [
      "Outerwear",
      "Suits & Blazers",
      "T-Shirts & Tanks",
      "Jeans",
      "Shorts",
      "Underwear & Socks",
      "Pants",
    ],
  },
  {
    title: "Couple Collection",
    items: [
      "Matching Sets",
      "Coordinated Outfits",
      "Anniversary Collection",
      "His & Hers Styles",
      "Themed Apparel",
      "Customizable Pairs",
      "Couples Loungewear",
    ],
  },
];

function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [footerSections, setFooterSections] = useState([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadFooterCollections() {
      try {
        const catRes = await categoriesService.getFooter();
        const categories =
          catRes?.data?.data?.categories ?? catRes?.data?.categories ?? [];
        if (!categories.length || cancelled) {
          if (!cancelled)
            setFooterSections(
              FALLBACK_SECTIONS.map((s) => ({
                ...s,
                items: s.items.map((name) => ({
                  name,
                  searchUrl: ROUTES.SEARCH,
                })),
              })),
            );
          setCollectionsLoaded(true);
          return;
        }
        const sections = [];
        for (const cat of categories) {
          const catId = cat._id;
          let subcategories = [];
          try {
            const subRes =
              await subcategoriesService.getFooterByCategoryId(catId);
            subcategories =
              subRes?.data?.data?.subcategories ??
              subRes?.data?.subcategories ??
              [];
          } catch (_) {}
          sections.push({
            categoryId: catId,
            title: cat.name || "Collection",
            items: subcategories.map((sub) => ({
              name: sub.name,
              searchUrl: `${ROUTES.SEARCH}?categoryId=${catId}&subcategoryId=${sub._id}`,
            })),
          });
          if (subcategories.length === 0) {
            sections[sections.length - 1].items = [
              {
                name: cat.name || "View all",
                searchUrl: `${ROUTES.SEARCH}?categoryId=${catId}`,
              },
            ];
          }
        }
        if (!cancelled && sections.length) setFooterSections(sections);
        else if (!cancelled)
          setFooterSections(
            FALLBACK_SECTIONS.map((s) => ({
              ...s,
              items: s.items.map((name) => ({
                name,
                searchUrl: ROUTES.SEARCH,
              })),
            })),
          );
      } catch (_) {
        if (!cancelled)
          setFooterSections(
            FALLBACK_SECTIONS.map((s) => ({
              ...s,
              items: s.items.map((name) => ({
                name,
                searchUrl: ROUTES.SEARCH,
              })),
            })),
          );
      }
      if (!cancelled) setCollectionsLoaded(true);
    }
    loadFooterCollections();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    setEmail("");
  };

  const sectionsToRender = footerSections.length
    ? footerSections
    : FALLBACK_SECTIONS.map((s) => ({
        ...s,
        items: s.items.map((name) => ({ name, searchUrl: ROUTES.SEARCH })),
      }));

  return (
    <footer className="mt-auto bg-black text-white font-inter">
      {/* ================= TOP SECTION ================= */}
      <div className="border-b border-white/20">
        <div className="px-4 sm:px-6 lg:px-12 py-10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col xl:flex-row gap-10">
              {/* COLLECTION GRID – from API (isFooter) or fallback */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 flex-1">
                {sectionsToRender.map((section, index) => (
                  <div key={section.categoryId || index}>
                    <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                      {section.title}
                    </h3>

                    <ul className="space-y-3">
                      {section.items.map((item, i) => (
                        <li key={i}>
                          <Link
                            to={
                              typeof item === "string"
                                ? ROUTES.SEARCH
                                : item.searchUrl
                            }
                            className="text-sm sm:text-base text-[#808282] hover:text-white transition-colors"
                          >
                            {typeof item === "string" ? item : item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* PROMO IMAGE */}
              <div className="w-full xl:w-[420px]">
                <img
                  src={khushDressImg}
                  alt="KHUSH dress"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MIDDLE SECTION ================= */}
      <div className="border-b border-white/20">
        <div className="px-4 sm:px-6 lg:px-12 py-10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* LEFT SIDE */}
              <div className="lg:max-w-md space-y-8">
                {/* EMAIL */}
                <form onSubmit={handleEmailSubmit}>
                  <div className="flex items-center gap-3 border-b border-white/40 pb-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER YOUR EMAIL ADDRESS"
                      className="flex-1 bg-transparent text-white placeholder-white/50 text-sm tracking-widest focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="hover:opacity-80 transition"
                    >
                      ➤
                    </button>
                  </div>
                </form>

                {/* LOGO */}
                <img
                  src={logoImg}
                  alt="KHUSH"
                  className="h-20 sm:h-28 brightness-0 invert"
                />
              </div>

              {/* RIGHT GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 flex-1">
                {/* CLIENT SERVICES */}
                <div>
                  <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                    CLIENT SERVICES
                  </h3>
                  <ul className="space-y-3 text-sm sm:text-base text-[#808282]">
                    <li>
                      <Link
                        to={ROUTES.REFUND_CANCEL_POLICY}
                        className="hover:text-white transition-colors"
                      >
                        Refund And Cancel Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.PAYMENT_POLICY}
                        className="hover:text-white transition-colors"
                      >
                        Payment Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.SHIPPING_DELIVERY_POLICY}
                        className="hover:text-white transition-colors"
                      >
                        Shipping And Delivery Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.FAQS}
                        className="hover:text-white transition-colors"
                      >
                        FAQs
                      </Link>
                    </li>
                    <li>
                      <Link to="#">Track Order</Link>
                    </li>
                    <li>
                      <Link to="#">Exchange & Returns</Link>
                    </li>
                    <li>
                      <Link to="#">Delete Account</Link>
                    </li>
                  </ul>
                </div>

                {/* BRAND */}
                <div>
                  <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                    BRAND
                  </h3>
                  <ul className="space-y-3 text-sm sm:text-base text-[#808282]">
                    <li>
                      <Link
                        to={ROUTES.ABOUT_US}
                        className="hover:text-white transition-colors"
                      >
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.CONTACT_US}
                        className="hover:text-white transition-colors"
                      >
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.TERMS_CONDITIONS}
                        className="hover:text-white transition-colors"
                      >
                        Terms & Conditions
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={ROUTES.PRIVACY_POLICY}
                        className="hover:text-white transition-colors"
                      >
                        Privacy Policy
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* SOCIAL */}
                <div>
                  <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                    SOCIAL
                  </h3>

                  <p className="text-sm sm:text-base text-[#808282] mb-4">
                    support@khushpehno.com
                  </p>

                  {/* Social Icons */}
                  <div className="flex gap-3 mb-6">
                    <a
                      href="https://www.facebook.com/khushpehno"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center hover:bg-white hover:text-black transition"
                    >
                      <FaFacebookF size={16} />
                    </a>

                    <a
                      href="https://www.instagram.com/khushpehno"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center hover:bg-white hover:text-black transition"
                    >
                      <FaInstagram size={16} />
                    </a>

                    <a
                      href="https://in.pinterest.com/khushpehno/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center hover:bg-white hover:text-black transition"
                    >
                      <FaPinterest size={16} />
                    </a>
                  </div>

                  {/* APP BUTTONS */}
                  <div className="flex flex-col gap-4">
                    {/* APP STORE */}
                    <a
                      href="#"
                      className="flex items-center gap-3 border-1 border-[#A6A6A6] rounded-xl px-4 py-3   transition"
                    >
                      <FaApple size={26} />
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs">Download on the</span>
                        <span className="text-base font-bold ">
                          App Store
                        </span>
                      </div>
                    </a>

                    {/* GOOGLE PLAY */}
                    <a
                      href="#"
                      className="flex items-center gap-3 border-1 border-[#A6A6A6] rounded-xl px-4 py-3   transition"
                    >
                      <FaGooglePlay size={22} />
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs uppercase">Get it on</span>
                        <span className="text-base font-bold">
                          Google Play
                        </span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= COPYRIGHT ================= */}
      <div className="py-6 text-center text-xs sm:text-sm text-white/60 px-4">
        © {currentYear} KHUSH. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
