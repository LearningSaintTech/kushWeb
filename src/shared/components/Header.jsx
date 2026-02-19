import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'
import {
  SearchIcon,
  HeartIcon,
  CartIcon,
  ProfileIcon,
  LocationIcon,
} from '../ui/icons'

import logoImg from '../../assets/images/navBar/logo.svg'
import mobileLogoImg from '../../assets/images/navBar/mobileLogo.svg'

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function HamburgerIcon({ className, open }) {
  if (open) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconBadge({ count, children }) {
  return (
    <span className="relative inline-block">
      {children}
      {count > 0 && (
        <span className="font-inter absolute -right-1 -top-1 md:-right-[0.52vw] md:-top-[0.52vw] flex h-3 w-3 md:h-[0.83vw] md:min-w-[0.83vw] items-center justify-center rounded-full bg-black px-0.5 md:px-[0.21vw] text-[10px] md:text-[0.52vw] font-medium text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}

const NAV_ITEMS = [
  { label: 'MEN', hasDropdown: true },
  { label: 'WOMEN', to: ROUTES.HOME },
  { label: 'COUPLE', to: ROUTES.HOME },
  { label: 'UNISEX', to: ROUTES.HOME },
]

const SUBCATEGORIES_COLUMNS = [
  [
    'Jackets & Coats',
    'Formal Wear',
    'Tees & Singlets',
    'Denim',
    'Boardies',
    'Socks & Boxers',
    'Trousers',
    'Chinos',
    'Cargo Pants',
    'Dress Pants',
  ],
  [
    'Bomber Jackets',
    'Tuxedos',
    'Muscle Tees',
    'Ripped Jeans',
    'Swim Shorts',
    'Long Socks',
    'Corduroy',
    'Wide Leg',
    'Slim Fit',
    'Pleated',
  ],
  [
    'Leather Jackets',
    'Three Piece',
    'V-Neck Tees',
    'Bootcut Jeans',
    'Bermuda Shorts',
    'Ankle Socks',
    'Relaxed Fit',
    'Skinny Fit',
    'Cuffed',
    'Drawstring',
  ],
  [
    'Puffer Jackets',
    'Double Breasted',
    'Crew Neck Tees',
    'Distressed Jeans',
    'Chino Shorts',
    'Sports Socks',
  ],
]

// Mobile menu subcategories
const MOBILE_SUBCATEGORIES = {
  MEN: [
    { label: 'Henleys', subItems: ['Jerseys', 'Button-Downs'] },
    { label: 'T-Shirts', subItems: [] },
    { label: 'Long Sleeves', subItems: [] },
    { label: 'Sweatshirts', subItems: [] },
    { label: 'Tank Tops', subItems: [] },
    { label: 'Polos', subItems: [] },
  ],
}

const MEGA_MENU_IMAGE =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menDropdownOpen, setMenDropdownOpen] = useState(false)
  const menCloseTimerRef = useRef(null)
  const [activeMobileCategory, setActiveMobileCategory] = useState('MEN')
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set(['Henleys']))

  const wishlistCount = 4
  const cartCount = 4

  const closeMenu = () => setMenuOpen(false)

  const toggleSubcategory = (label) => {
    setExpandedSubcategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(label)) {
        newSet.delete(label)
      } else {
        newSet.add(label)
      }
      return newSet
    })
  }

  const headerRef = useRef(null)
  const [dropdownTop, setDropdownTop] = useState(0)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const onResize = () => setDropdownTop(el.getBoundingClientRect().bottom)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Add style to hide scrollbar for mobile menu
  useEffect(() => {
    if (menuOpen) {
      const style = document.createElement('style')
      style.textContent = `
        .mobile-menu-scroll::-webkit-scrollbar {
          display: none;
        }
      `
      document.head.appendChild(style)
      return () => {
        document.head.removeChild(style)
      }
    }
  }, [menuOpen])

  const openMenDropdown = () => {
    if (menCloseTimerRef.current) clearTimeout(menCloseTimerRef.current)
    setMenDropdownOpen(true)
  }

  const scheduleCloseMenDropdown = () => {
    menCloseTimerRef.current = setTimeout(() => setMenDropdownOpen(false), 150)
  }

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 w-full z-50 bg-white">

      {/* Promo Bar */}
      <div className="font-inter rounded-lg md:rounded-[0.7vw] bg-black py-2 md:pt-[0.42vw] md:pb-[0.42vw] mx-3 md:ml-[0.83vw] md:mr-[0.83vw] text-center font-light text-xs sm:text-sm md:text-[1.04vw] text-white px-2 md:px-0">
        <span className="block truncate">Get 30% off for first transaction using</span>
      </div>

      {/* Main Header */}
      <div className="bg-white px-4 md:px-[1.56vw] py-2 md:py-[0.52vw]">

        {/* Mobile Layout - Two Rows (only for screens < 768px) */}
        <div className="md:hidden flex flex-col gap-3">
          {/* Row 1: Logo + Location + Hamburger */}
          <div className="flex items-center gap-2">
            <NavLink to={ROUTES.HOME} className="flex shrink-0 items-center">
              <img
                src={mobileLogoImg}
                alt="KHUSH"
                className="h-9 w-9"
              />
            </NavLink>

            <div className="flex flex-1 min-w-0 items-center gap-2 rounded-full bg-[#F5F5F5] px-2 py-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <LocationIcon className="h-4 w-4 text-black" />
              </div>
              <span className="font-inter text-xs text-[#636363] truncate">
                B-127, B BLOCK, SECTOR 69, N...
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-black hover:bg-gray-100"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <HamburgerIcon className="h-6 w-6" open={menuOpen} />
            </button>
          </div>

          {/* Row 2: Search + Icons */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1.5">
              <input
                type="search"
                placeholder="Find Your Choice"
                className="font-inter w-full bg-transparent text-sm placeholder:text-[#636363] focus:outline-none"
              />
              <SearchIcon className="h-4 w-4 text-black shrink-0" />
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="text-black hover:opacity-70" aria-label="Wishlist">
                <IconBadge count={wishlistCount}>
                  <HeartIcon className="h-6 w-6" />
                </IconBadge>
              </button>

              <NavLink to={ROUTES.CART} className="text-black hover:opacity-70" aria-label="Cart">
                <IconBadge count={cartCount}>
                  <CartIcon className="h-6 w-6" />
                </IconBadge>
              </NavLink>

              <NavLink to={ROUTES.ACCOUNT} className="text-black hover:opacity-70" aria-label="Account">
                <ProfileIcon className="h-5 w-5" />
              </NavLink>
            </div>
          </div>
        </div>

        {/* Desktop/Tablet Layout - Single Row (for screens >= 768px) */}
        <div className="hidden md:flex flex-row items-center gap-0">

          {/* Logo + Location */}
          <div className="flex shrink-0 items-center gap-[1.04vw]">

            <NavLink to={ROUTES.HOME} className="flex shrink-0 items-center">
              <img
                src={logoImg}
                alt="KHUSH"
                className="h-[2.81vw] w-[7.29vw]"
              />
            </NavLink>

            <div className="flex min-w-0 items-center gap-[0.83vw] rounded-full bg-[#F5F5F5] px-[0.83vw] py-[0.63vw] w-[18.1vw]">
              <div className="flex h-[2.08vw] w-[2.08vw] shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <LocationIcon className="h-5 w-5 text-black" />
              </div>
              <span className="font-inter text-[0.83vw] text-[#636363] truncate">
                B-127, B BLOCK, SECTOR 69, N...
              </span>
            </div>

          </div>

          {/* Center Nav */}
          <nav className="flex flex-1 items-center justify-center gap-[2.08vw]">
            {NAV_ITEMS.map((item) =>
              item.hasDropdown ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={openMenDropdown}
                  onMouseLeave={scheduleCloseMenDropdown}
                >
                  <button className="font-inter flex items-center gap-[0.21vw] text-[0.83vw] text-black">
                    {item.label}
                    <ChevronDownIcon
                      className={`h-4 w-4 transition ${menDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className="font-inter text-[0.83vw] text-black"
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-[0.83vw]">

            <div className="flex items-center gap-[4.63vw] rounded-full bg-[#F5F5F5] px-[1.04vw] py-[0.63vw]">
              <input
                type="search"
                placeholder="Find Your Choice"
                className="font-inter w-full bg-transparent text-[0.83vw] placeholder:text-[#636363] focus:outline-none"
              />
              <SearchIcon className="h-5 w-5 text-black shrink-0" />
            </div>

            <div className="flex items-center gap-[1.3vw]">
              <button type="button" className="text-black hover:opacity-70" aria-label="Wishlist">
                <IconBadge count={wishlistCount}>
                  <HeartIcon className="h-[1.87vw] w-[1.87vw]" />
                </IconBadge>
              </button>

              <NavLink to={ROUTES.CART} className="text-black hover:opacity-70" aria-label="Cart">
                <IconBadge count={cartCount}>
                  <CartIcon className="h-[1.87vw] w-[1.87vw]" />
                </IconBadge>
              </NavLink>

              <NavLink to={ROUTES.ACCOUNT} className="text-black hover:opacity-70" aria-label="Account">
                <ProfileIcon className="h-[1.04vw] w-[1.04vw]" />
              </NavLink>
            </div>

          </div>

        </div>

        {/* Mega Menu */}
        {menDropdownOpen && (
          <div
            className="fixed left-0 right-0 z-30 hidden md:block"
            style={{ top: dropdownTop }}
            onMouseEnter={openMenDropdown}
            onMouseLeave={scheduleCloseMenDropdown}
          >
            <div className="flex justify-center mt-[0.83vw]">
              <div className="w-full max-w-[72.92vw] rounded-[2.08vw]  bg-white shadow-lg">

                <div className="flex min-h-[21.35vw]">

                  <div className="w-[18.23vw] h-[20.83vw] p-[1.56vw]">
                    <img
                      src={MEGA_MENU_IMAGE}
                      alt=""
                      className="h-full w-full object-cover rounded-[1.04vw]"
                    />
                  </div>

                  <div className="flex flex-1 gap-[2.08vw] py-[1.56vw] px-[2.08vw]">
                    {SUBCATEGORIES_COLUMNS.map((column, i) => (
                      <div key={i} className="flex flex-1 flex-col gap-[0.52vw]">
                        {column.map((label) => (
                          <NavLink
                            key={label}
                            to={ROUTES.SEARCH}
                            className="font-inter text-[0.83vw] text-[#636363] hover:text-black"
                          >
                            {label}
                          </NavLink>
                        ))}
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Overlay (only for screens < 768px) */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={closeMenu}
              aria-hidden
            />
            <div className="fixed inset-0 z-50 bg-white md:hidden overflow-y-auto">
              <div className="flex flex-col h-full">
                {/* Close Button - Top Left */}
                <div className="p-4 pb-0">
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="flex h-10 w-10 items-center justify-center text-black hover:bg-gray-100 rounded-lg"
                    aria-label="Close menu"
                  >
                    <CloseIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Horizontally Scrollable Categories */}
                <div className="px-4 pt-4 pb-2">
                  <div 
                    className="flex gap-6 overflow-x-auto pb-2 mobile-menu-scroll"
                    style={{ 
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeMobileCategory === item.label
                      return (
                        <button
                          key={item.label}
                          onClick={() => setActiveMobileCategory(item.label)}
                          className="flex flex-col items-center gap-1 shrink-0 relative"
                        >
                          <span
                            className={`font-inter text-base font-medium whitespace-nowrap ${
                              isActive ? 'text-black' : 'text-gray-400'
                            }`}
                          >
                            {item.label}
                          </span>
                          {isActive && (
                            <>
                              {/* Diamond indicator */}
                              <div className="w-1.5 h-1.5 bg-black rotate-45 mt-0.5"></div>
                              {/* Underline */}
                              <div className="absolute -bottom-0.5 left-0 right-0 h-px bg-black"></div>
                            </>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Subcategories List */}
                <div className="flex-1 px-4 pb-4">
                  {activeMobileCategory === 'MEN' && MOBILE_SUBCATEGORIES.MEN && (
                    <div className="flex flex-col">
                      {MOBILE_SUBCATEGORIES.MEN.map((category) => {
                        const isExpanded = expandedSubcategories.has(category.label)
                        const hasSubItems = category.subItems && category.subItems.length > 0
                        return (
                          <div key={category.label} className="border-b border-gray-200">
                            <button
                              type="button"
                              onClick={() => hasSubItems && toggleSubcategory(category.label)}
                              className="w-full flex items-center justify-between py-4 text-left"
                            >
                              <span className="font-inter text-base font-medium text-black">
                                {category.label}
                              </span>
                              {hasSubItems && (
                                <ChevronDownIcon
                                  className={`h-5 w-5 text-black transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </button>
                            {hasSubItems && isExpanded && (
                              <div className="pl-4 pb-2">
                                {category.subItems.map((subItem) => (
                                  <NavLink
                                    key={subItem}
                                    to={ROUTES.SEARCH}
                                    onClick={closeMenu}
                                    className="block py-2 font-inter text-sm text-gray-600 hover:text-black"
                                  >
                                    {subItem}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </header>
  )
}
