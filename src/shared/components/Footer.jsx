import { useState, useEffect, useRef } from "react";
import { debugError } from '../../utils/debugLog.js';
import { Link } from "react-router-dom";
import { ROUTES, getSearchPath } from "../../utils/constants";
import logoImg from "../../assets/images/navBar/SVG.svg";
// import khushDressImg from "../../assets/images/footer/khushDress.png";
import editorialImg from "../../assets/images/limited-edition/editorial.png";
import fashionDuoImg from "../../assets/images/limited-edition/fashion-duo.png";
import dunesImg from "../../assets/images/limited-edition/dunes.png";
import flatlayImg from "../../assets/images/limited-edition/flatlay.png";
import studioWideImg from "../../assets/images/limited-edition/studio-wide.png";
import communityGirlImg from "../../assets/images/community/communitygirl.jpg";
import thumb1Img from "../../assets/images/special-discount/thumb-1.png";
import thumb2Img from "../../assets/images/special-discount/thumb-2.png";
import thumb3Img from "../../assets/images/special-discount/thumb-3.png";
import thumb4Img from "../../assets/images/special-discount/thumb-4.png";
import photo1 from "../../assets/images/special-discount/photo-15.avif";
import photo2 from "../../assets/images/special-discount/photo11.avif";
import {
  categoriesService,
  subcategoriesService,
} from "../../services/categories.service.js";
import { contactUsService } from "../../services";
import { CONTACT_LIMITS, validateContactForm } from "../../utils/validators";
import {
  FaFacebookF,
  FaInstagram,
  FaPinterest,
  FaApple,
  FaGooglePlay,
} from "react-icons/fa";
// import { FaXTwitter } from "react-icons/fa6";

const FOOTER_PHOTO_SERIES = [
  editorialImg,
  fashionDuoImg,
  dunesImg,
  flatlayImg,
  studioWideImg,
  photo1,
  photo2,
  communityGirlImg,
  thumb1Img,
  thumb2Img,
  thumb3Img,
  thumb4Img,
];

function KhushPhotoBanner() {
  // Two identical halves → CSS translateX(-50%) loops seamlessly
  const strip = [...FOOTER_PHOTO_SERIES, ...FOOTER_PHOTO_SERIES];
  const bannerRef = useRef(null);

  // While hovering KHUSH, block mouse-wheel page scroll — only the photo strip moves
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const blockVerticalScroll = (e) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", blockVerticalScroll, { passive: false });
    return () => {
      el.removeEventListener("wheel", blockVerticalScroll);
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className="group/khush relative w-full overflow-x-hidden bg-black outline-none select-none pt-2 sm:pt-3 pb-1 overscroll-none"
      tabIndex={0}
      aria-label="KHUSH — hover to reveal scrolling photos"
    >
      {/* Text defines height — do not clip vertically or letters collapse */}
      <div className="relative flex w-full items-center justify-center">
        {/* Photos only: clip horizontal marquee here, not the KHUSH text */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover/khush:opacity-100 group-focus-within/khush:opacity-100">
          <div className="khush-footer-marquee flex h-full w-max will-change-transform">
            {strip.map((src, i) => (
              <div
                key={`${i}-${typeof src === "string" ? src : i}`}
                className="h-full w-[clamp(4.5rem,11vw,9rem)] shrink-0"
              >
                <img
                  src={src}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                  draggable={false}
                  loading={i < 8 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </div>

        <h2 className="relative z-10 w-full text-center text-[24vw] font-extrabold uppercase leading-none tracking-[0.01em] text-white select-none">
          KHUSH
        </h2>
      </div>
    </div>
  );
}
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
  const [contactStatus, setContactStatus] = useState(null);
  const [contactFieldErrors, setContactFieldErrors] = useState({});
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
    if (contactFieldErrors[name]) {
      setContactFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (contactStatus) setContactStatus(null);
  };

  const handleContactBlur = (e) => {
    const { name } = e.target;
    const result = validateContactForm(contactForm, { phoneRequired: false });
    if (result.errors[name]) {
      setContactFieldErrors((prev) => ({ ...prev, [name]: result.errors[name] }));
    }
  };

  const contactInputClass = (field) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
      contactFieldErrors[field]
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:ring-black"
    }`;

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const result = validateContactForm(contactForm, { phoneRequired: false });
    if (!result.valid) {
      setContactFieldErrors(result.errors);
      setContactStatus({ type: "error", text: "Please fix the error above." });
      return;
    }

    const { name, email, phone, subject, message } = result.values;

    try {
      setIsSubmitting(true);
      setContactStatus(null);
      setContactFieldErrors({});
      await contactUsService.submit({
        name,
        email,
        phone: phone || undefined,
        subject: subject || undefined,
        message,
      });
      setContactForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setContactStatus({
        type: "success",
        text: "Thank you! We received your message and will respond soon.",
      });
    } catch (err) {
      debugError("Failed to submit contact-us request from footer modal", err);
      setContactStatus({
        type: "error",
        text: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeContactModal = () => {
    setShowContactForm(false);
    setContactStatus(null);
    setContactFieldErrors({});
  };

  const sectionsToRender = footerSections.length
    ? footerSections
    : FALLBACK_SECTIONS.map((s) => ({
        ...s,
        items: s.items.map((name) => ({ name, searchUrl: ROUTES.SEARCH })),
      }));

  return (
    <footer className="mt-auto bg-black text-white font-inter">
      {/* Big KHUSH — photo series scrolls on hover */}
      <KhushPhotoBanner />

      {/* ================= TOP SECTION ================= */}
      <div className="border-b border-white/20">
        {/* <div className="px-4 sm:px-6 lg:px-12 py-10"> */}
          {/* <div className="max-w-[1600px] mx-auto"> */}
            {/* <div className="flex flex-col xl:flex-row gap-10"> */}
              {/* COLLECTION GRID – from API (isFooter) or fallback */}
              {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 flex-1">
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
              </div> */}

              {/* PROMO IMAGE */}
              {/* <div className="w-full xl:w-[420px]">
                <img
                  src={khushDressImg}
                  alt="KHUSH dress"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div> */}
            {/* </div> */}
          {/* </div> */}
        {/* </div> */}
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
                    SHARE YOUR FEEDBACK
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
                    {/* <li>
                      <Link to="#">Track Order</Link>
                    </li> */}
                    <li>
                      <Link
                        to={ROUTES.RETURN_POLICY}
                        className="hover:text-white transition-colors"
                      >
                        Exchange & Returns
                      </Link>
                    </li>
                    <li>
                      <Link to={ROUTES.DELETE_ACCOUNT}>Delete Account</Link>
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
                  <p className="text-sm sm:text-base text-[#808282] mb-4 leading-relaxed">
                    <span className="text-white">Address: </span>
                    B-127, B Block, Sector 69, Noida, Uttar Pradesh 201309
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
                      href="https://apps.apple.com/in/app/khush/id6761365897"
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
                      href="https://play.google.com/store/apps/details?id=com.khushpehno.app&pcampaignid=web_share"
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
        © {currentYear} KHUSH LIFESTYLE PRIVATE LIMITED. All rights reserved.
      </div>

      {/* ================= CONTACT US MODAL ================= */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white text-black w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 relative">
            <button
              type="button"
              onClick={closeContactModal}
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 tracking-wide">
             Share Your Feedback
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Share your query or feedback and our team will get back to you.
            </p>
            <form onSubmit={handleContactSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="footer-contact-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Name*
                  </label>
                  <input
                    id="footer-contact-name"
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    maxLength={CONTACT_LIMITS.nameMax}
                    autoComplete="name"
                    aria-invalid={contactFieldErrors.name ? true : undefined}
                    aria-describedby={contactFieldErrors.name ? "footer-contact-name-error" : undefined}
                    className={contactInputClass("name")}
                  />
                  {contactFieldErrors.name && (
                    <p id="footer-contact-name-error" className="mt-1 text-xs text-red-600" role="alert">
                      {contactFieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="footer-contact-email" className="block text-xs font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    id="footer-contact-email"
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    maxLength={CONTACT_LIMITS.emailMax}
                    autoComplete="email"
                    aria-invalid={contactFieldErrors.email ? true : undefined}
                    aria-describedby={contactFieldErrors.email ? "footer-contact-email-error" : undefined}
                    className={contactInputClass("email")}
                  />
                  {contactFieldErrors.email && (
                    <p id="footer-contact-email-error" className="mt-1 text-xs text-red-600" role="alert">
                      {contactFieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="footer-contact-phone" className="block text-xs font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="footer-contact-phone"
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    value={contactForm.phone}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    maxLength={10}
                    autoComplete="tel"
                    aria-invalid={contactFieldErrors.phone ? true : undefined}
                    aria-describedby={contactFieldErrors.phone ? "footer-contact-phone-error" : undefined}
                    className={contactInputClass("phone")}
                  />
                  {contactFieldErrors.phone && (
                    <p id="footer-contact-phone-error" className="mt-1 text-xs text-red-600" role="alert">
                      {contactFieldErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="footer-contact-subject" className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    id="footer-contact-subject"
                    type="text"
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                    maxLength={CONTACT_LIMITS.subjectMax}
                    aria-invalid={contactFieldErrors.subject ? true : undefined}
                    aria-describedby={contactFieldErrors.subject ? "footer-contact-subject-error" : undefined}
                    className={contactInputClass("subject")}
                  />
                  {contactFieldErrors.subject && (
                    <p id="footer-contact-subject-error" className="mt-1 text-xs text-red-600" role="alert">
                      {contactFieldErrors.subject}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="footer-contact-message" className="block text-xs font-medium text-gray-700 mb-1">
                  Message*
                </label>
                <textarea
                  id="footer-contact-message"
                  name="message"
                  rows={4}
                  value={contactForm.message}
                  onChange={handleContactChange}
                  onBlur={handleContactBlur}
                  maxLength={CONTACT_LIMITS.messageMax}
                  aria-invalid={contactFieldErrors.message ? true : undefined}
                  aria-describedby={contactFieldErrors.message ? "footer-contact-message-error" : undefined}
                  className={`${contactInputClass("message")} resize-none`}
                />
                {contactFieldErrors.message && (
                  <p id="footer-contact-message-error" className="mt-1 text-xs text-red-600" role="alert">
                    {contactFieldErrors.message}
                  </p>
                )}
              </div>

              {contactStatus && (
                <p
                  className={`text-sm ${
                    contactStatus.type === "success" ? "text-green-700" : "text-red-600"
                  }`}
                  role="alert"
                >
                  {contactStatus.text}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-100"
                >
                  {contactStatus?.type === "success" ? "Close" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm rounded-full bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting…" : "Submit"}
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
