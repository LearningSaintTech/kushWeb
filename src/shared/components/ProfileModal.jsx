import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { useCartWishlist } from '../../app/context/CartWishlistContext'
import { ROUTES } from '../../utils/constants'
import { HeartIcon, CartIcon } from '../ui/icons'

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function LocationPinIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PackageIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function TagIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function DocumentIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Address', to: ROUTES.ADDRESS, icon: LocationPinIcon },
  { label: 'Orders', to: ROUTES.ORDERS, icon: PackageIcon },
  { label: 'Coupons', to: ROUTES.COUPONS, icon: TagIcon },
  { label: 'Contact Us', to: ROUTES.CONTACT_US, icon: PhoneIcon },
  { label: 'Terms & Conditions', to: ROUTES.TERMS_CONDITIONS, icon: DocumentIcon },
]

export default function ProfileModal({ open, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { wishlistCount, cartCount } = useCartWishlist()

  const displayName = user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ') ?? 'User'
  const avatarUrl = user?.profileImage ?? user?.avatar ?? user?.image ?? null

  const handleUpdateProfile = () => {
    onClose()
    navigate(ROUTES.ACCOUNT)
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  const handleNavClick = () => {
    onClose()
  }

  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (open) {
      setEntered(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    } else {
      setEntered(false)
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: entered ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 py-4 px-4 border-b border-gray-200">
          <h2 className="font-inter text-xl font-semibold uppercase tracking-wide text-black">Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-black hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* User card */}
          <div className="rounded-xl bg-black p-4 flex items-center gap-4 mb-6">
            <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-gray-700">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="font-inter w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-['Roboto'] font-bold text-white uppercase tracking-wide truncate">
                {displayName}
              </p>
              <p className="font-inter text-sm text-white/90 truncate">Style Preference Here</p>
            </div>
          </div>

          {/* Wishlist & Cart (primary on mobile/tablet where they’re not in header) */}
          <div className="flex flex-col gap-2 mb-6 md:hidden">
            <Link
              to={ROUTES.WISHLIST}
              onClick={handleNavClick}
              className="font-inter flex items-center gap-3 py-3 px-4 rounded-lg border border-gray-200 text-black text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <HeartIcon className="h-5 w-5 shrink-0 text-gray-600" />
              <span className="flex-1">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black text-white text-xs font-medium px-1.5">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
            <Link
              to={ROUTES.CART}
              onClick={handleNavClick}
              className="font-inter flex items-center gap-3 py-3 px-4 rounded-lg border border-gray-200 text-black text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <CartIcon className="h-5 w-5 shrink-0 text-gray-600" />
              <span className="flex-1">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black text-white text-xs font-medium px-1.5">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={handleUpdateProfile}
              className="font-inter w-full py-3 px-4  bg-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              Update Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="font-inter w-full py-3 px-4  bg-white border-1 border-black text-black text-sm font-semibold uppercase tracking-wide hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>

          {/* Account nav list */}
          <nav className="flex flex-col">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                onClick={handleNavClick}
                className="font-inter flex items-center gap-3 py-4 text-black text-sm  hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0"
              >
                <Icon className="h-5 w-5 shrink-0 text-gray-600" />
                <span className="flex-1">{label}</span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}
