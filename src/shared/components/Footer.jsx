import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTES, getSearchPath } from "../../utils/constants";
import logoImg from "../../assets/images/navBar/SVG.svg";
import khushDressImg from "../../assets/images/footer/khushDress.png";
import {
  categoriesService,
  subcategoriesService,
} from "../../services/categories.service.js";
import { contactUsService } from "../../services";
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
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
              searchUrl: getSearchPath({
                categoryId: catId,
                subcategoryId: sub._id,
                categoryName: cat.name,
                subcategoryName: sub.name,
              }),
            })),
          });
          if (subcategories.length === 0) {
            sections[sections.length - 1].items = [
              {
                name: cat.name || "View all",
                searchUrl: getSearchPath({
                  categoryId: catId,
                  categoryName: cat.name,
                }),
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

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, subject, message } = contactForm;
    if (!name.trim() || !email.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      await contactUsService.submit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
        source: "web-footer-modal",
      });
      setShowContactForm(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      // optional: surface error via toast/snackbar
      console.error("Failed to submit contact-us request from footer modal", err);
    } finally {
      setIsSubmitting(false);
    }
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
                {/* CLICKABLE CONTACT US BAR (FAKE INPUT) */}
                <button
                  type="button"
                  onClick={() => setShowContactForm(true)}
                  className="w-full flex items-center gap-3 border-b border-white/40 pb-3 text-left"
                >
                  <span className="flex-1 bg-transparent text-white/50 text-sm tracking-widest">
                    CONTACT US
                  </span>
                  <span className="hover:opacity-80 transition">➤</span>
                </button>

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

      {/* ================= CONTACT US MODAL ================= */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white text-black w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={() => setShowContactForm(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 tracking-wide">
              Contact Us
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Share your query or feedback and our team will get back to you.
            </p>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={contactForm.name}
                    onChange={handleContactChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={contactForm.email}
                    onChange={handleContactChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleContactChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Message*
                </label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={handleContactChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm rounded-full bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
