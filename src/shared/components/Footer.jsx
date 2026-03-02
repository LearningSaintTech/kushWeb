import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import logoImg from '../../assets/images/navBar/logo.svg'
import khushDressImg from '../../assets/images/footer/khushDress.png'
import { categoriesService, subcategoriesService } from '../../services/categories.service.js'

/** Static fallback when API returns no footer data (matches your copy). */
const FALLBACK_SECTIONS = [
  {
    title: "Men's Collection",
    items: [
      'Outerwear', 'Suits & Blazers', 'T-Shirts & Tanks',
      'Jeans', 'Shorts', 'Underwear & Socks', 'Pants'
    ]
  },
  {
    title: "Women's Collection",
    items: [
      'Dresses', 'Tops & Tees', 'Jeans',
      'Skirts', 'Lingerie', 'Sweaters', 'Blouses'
    ]
  },
  {
    title: "Unisex Collection",
    items: [
      'Outerwear', 'Suits & Blazers', 'T-Shirts & Tanks',
      'Jeans', 'Shorts', 'Underwear & Socks', 'Pants'
    ]
  },
  {
    title: "Couple Collection",
    items: [
      'Matching Sets', 'Coordinated Outfits', 'Anniversary Collection',
      'His & Hers Styles', 'Themed Apparel', 'Customizable Pairs', 'Couples Loungewear'
    ]
  }
]

function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [footerSections, setFooterSections] = useState([])
  const [collectionsLoaded, setCollectionsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadFooterCollections() {
      try {
        const catRes = await categoriesService.getFooter()
        const categories = catRes?.data?.data?.categories ?? catRes?.data?.categories ?? []
        if (!categories.length || cancelled) {
          if (!cancelled) setFooterSections(FALLBACK_SECTIONS.map(s => ({ ...s, items: s.items.map(name => ({ name, searchUrl: ROUTES.SEARCH })) })))
          setCollectionsLoaded(true)
          return
        }
        const sections = []
        for (const cat of categories) {
          const catId = cat._id
          let subcategories = []
          try {
            const subRes = await subcategoriesService.getFooterByCategoryId(catId)
            subcategories = subRes?.data?.data?.subcategories ?? subRes?.data?.subcategories ?? []
          } catch (_) {}
          sections.push({
            categoryId: catId,
            title: cat.name || 'Collection',
            items: subcategories.map((sub) => ({
              name: sub.name,
              searchUrl: `${ROUTES.SEARCH}?categoryId=${catId}&subcategoryId=${sub._id}`
            }))
          })
          if (subcategories.length === 0) {
            sections[sections.length - 1].items = [{ name: cat.name || 'View all', searchUrl: `${ROUTES.SEARCH}?categoryId=${catId}` }]
          }
        }
        if (!cancelled && sections.length) setFooterSections(sections)
        else if (!cancelled) setFooterSections(FALLBACK_SECTIONS.map(s => ({ ...s, items: s.items.map(name => ({ name, searchUrl: ROUTES.SEARCH })) })))
      } catch (_) {
        if (!cancelled) setFooterSections(FALLBACK_SECTIONS.map(s => ({ ...s, items: s.items.map(name => ({ name, searchUrl: ROUTES.SEARCH })) })))
      }
      if (!cancelled) setCollectionsLoaded(true)
    }
    loadFooterCollections()
    return () => { cancelled = true }
  }, [])

  const handleEmailSubmit = (e) => {
    e.preventDefault()
    console.log('Email submitted:', email)
    setEmail('')
  }

  const sectionsToRender = footerSections.length
    ? footerSections
    : FALLBACK_SECTIONS.map(s => ({ ...s, items: s.items.map(name => ({ name, searchUrl: ROUTES.SEARCH })) }))

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
                            to={typeof item === 'string' ? ROUTES.SEARCH : item.searchUrl}
                            className="text-sm sm:text-base text-[#808282] hover:text-white transition-colors"
                          >
                            {typeof item === 'string' ? item : item.name}
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
                    <button type="submit" className="hover:opacity-80 transition">
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
                    <li><Link to={ROUTES.REFUND_CANCEL_POLICY} className="hover:text-white transition-colors">Refund And Cancel Policy</Link></li>
                    <li><Link to={ROUTES.PAYMENT_POLICY} className="hover:text-white transition-colors">Payment Policy</Link></li>
                    <li><Link to={ROUTES.SHIPPING_DELIVERY_POLICY} className="hover:text-white transition-colors">Shipping And Delivery Policy</Link></li>
                    <li><Link to={ROUTES.FAQS} className="hover:text-white transition-colors">FAQs</Link></li>
                    <li><Link to="#">Track Order</Link></li>
                    <li><Link to="#">Exchange & Returns</Link></li>
                    <li><Link to="#">Delete Account</Link></li>
                  </ul>
                </div>

                {/* BRAND */}
                <div>
                  <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                    BRAND
                  </h3>
                  <ul className="space-y-3 text-sm sm:text-base text-[#808282]">
                    <li><Link to={ROUTES.ABOUT_US} className="hover:text-white transition-colors">About Us</Link></li>
                    <li><Link to={ROUTES.CONTACT_US} className="hover:text-white transition-colors">Contact Us</Link></li>
                    <li><Link to={ROUTES.TERMS_CONDITIONS} className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                    <li><Link to={ROUTES.PRIVACY_POLICY} className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  </ul>
                </div>

                {/* SOCIAL */}
                <div>
                  <h3 className="mb-4 text-lg sm:text-xl font-semibold uppercase tracking-wider">
                    SOCIAL
                  </h3>

                  <p className="text-sm sm:text-base text-[#808282] mb-4">
                    contact@yoraa.in
                  </p>

                  {/* Social Icons */}
                  <div className="flex gap-3 mb-6">
                    {['F', 'I', 'X'].map((icon, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center hover:border-white transition"
                      >
                        {icon}
                      </div>
                    ))}
                  </div>

                  {/* APP BUTTONS */}
                  <div className="flex flex-col gap-3">
                    <button className="w-full sm:w-auto border border-white/40 rounded-lg px-4 py-3 hover:bg-white/10 transition text-sm">
                      Download on the App Store
                    </button>

                    <button className="w-full sm:w-auto border border-white/40 rounded-lg px-4 py-3 hover:bg-white/10 transition text-sm">
                      Get it on Google Play
                    </button>
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
  )
}

export default Footer