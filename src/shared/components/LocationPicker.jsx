import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { setLocation, setLoading, setError } from '../../app/store/slices/locationSlice'
import { getCurrentLocationPincode } from '../../services/geo.service'
import { addressService } from '../../services/address.service'
import { useAuth } from '../../app/context/AuthContext'
import { LocationIcon } from '../ui/icons'
import { ROUTES } from '../../utils/constants'

function formatAddressLabel(addr) {
  if (!addr) return ''
  const parts = [addr.addressLine, addr.city, addr.state, addr.pinCode].filter(Boolean)
  return parts.join(', ')
}

export default function LocationPicker({ scrolled, className = '', compact = false }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const pincode = useSelector((s) => s.location?.pincode)
  const addressLabel = useSelector((s) => s.location?.addressLabel)
  const isLoading = useSelector((s) => s.location?.isLoading ?? false)
  const error = useSelector((s) => s.location?.error)

  const [open, setOpen] = useState(false)
  const [panelAnimateOpen, setPanelAnimateOpen] = useState(false)
  const [usingCurrent, setUsingCurrent] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false)
  const panelRef = useRef(null)

  const resolvedLabel = addressLabel || (pincode ? `Pin ${pincode}` : null)

  const displayPlaceholder = (() => {
    if (isLoading || usingCurrent) return 'Detecting location...'
    if (error) return 'Select location'
    return 'Select location'
  })()

  useEffect(() => {
    if (!open) {
      setPanelAnimateOpen(false)
      return
    }
    const id = requestAnimationFrame(() => setPanelAnimateOpen(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  const handleUseCurrentLocation = async () => {
    setUsingCurrent(true)
    dispatch(setLoading(true))
    dispatch(setError(null))
    try {
      const { pincode: pin, addressLabel: label } = await getCurrentLocationPincode()
      if (pin || label) {
        dispatch(setLocation({ pincode: pin, addressLabel: label, selectedAddressId: null }))
        setOpen(false)
      } else {
        dispatch(setError('Address could not be resolved. Please choose from addresses.'))
      }
    } catch (err) {
      dispatch(setError(err?.message ?? 'Could not get location'))
    } finally {
      setUsingCurrent(false)
      dispatch(setLoading(false))
    }
  }

  const handleGoToAddress = () => {
    setOpen(false)
    navigate(ROUTES.ADDRESS)
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(max-width: 767px)')
    if (!mq.matches) return
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [open])

  useEffect(() => {
    if (!open || !isAuthenticated) {
      setSavedAddresses([])
      return
    }
    setSavedAddressesLoading(true)
    addressService.getAll({ page: 1, limit: 20 })
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        const list = Array.isArray(data?.addresses) ? data.addresses : Array.isArray(data) ? data : []
        setSavedAddresses(list)
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setSavedAddressesLoading(false))
  }, [open, isAuthenticated])

  const handleUseSavedAddress = (addr) => {
    const label = formatAddressLabel(addr)
    const pin = addr.pinCode != null ? String(addr.pinCode) : null
    const id = addr._id ?? null
    if (pin) {
      dispatch(setLocation({ pincode: pin, addressLabel: label || `Pin ${pin}`, selectedAddressId: id }))
      dispatch(setError(null))
      setOpen(false)
    }
  }

  const isLight = scrolled
  const textClass = isLight ? 'text-[#636363]' : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
  const iconClass = isLight ? 'text-black' : 'text-white'
  const bgClass = isLight ? 'bg-[#F5F5F5]' : 'bg-white/10'
  const iconBgClass = isLight ? 'bg-white shadow-sm' : 'bg-white/20'

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        type="button"
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full px-2 py-1 md:gap-[0.83vw] md:px-[0.83vw] md:py-[0.3vw] ${bgClass} ${
          compact ? 'w-full md:w-[18.1vw]' : ''
        } ${error ? 'ring-1 ring-amber-400/80' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Delivery location"
      >
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-[1.8vw] md:w-[1.8vw] ${iconBgClass}`}>
          <LocationIcon className={`h-4 w-4 md:h-5 md:w-5 ${iconClass}`} />
        </div>
        <span
          title={resolvedLabel || displayPlaceholder}
          className={`font-inter min-w-0 flex-1 truncate text-left text-xs md:text-[0.83vw] ${textClass} ${!resolvedLabel ? 'opacity-70' : ''}`}
        >
          {resolvedLabel || displayPlaceholder}
        </span>
        <span className={`inline-flex shrink-0 ${textClass} transition-transform duration-200 ease-out`}>
          {open ? <FaChevronUp className="h-4 w-4 md:h-5 md:w-5" /> : <FaChevronDown className="h-4 w-4 md:h-5 md:w-5" />}
        </span>
      </button>

      {open && (
        <>
          {/* Phone: dim background + bottom sheet (avoids narrow in-row popover) */}
          <button
            type="button"
            className={`fixed inset-0 z-55 bg-black/45 backdrop-blur-[3px] transition-opacity duration-200 md:hidden ${
              panelAnimateOpen ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Close delivery location"
            onClick={() => setOpen(false)}
          />
          <div
            id="location-listbox"
            className={`z-60 flex flex-col overflow-hidden overscroll-contain border border-neutral-200/80 bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:duration-200 md:ease-[cubic-bezier(0.16,1,0.3,1)]
              fixed inset-x-0 bottom-0 max-h-[min(88dvh,calc(100dvh-4.5rem))] rounded-t-3xl pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]
              md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:max-h-none md:w-[min(100%,18rem)] md:rounded-2xl md:pb-0 md:min-w-[20rem] md:max-w-88
              ${panelAnimateOpen ? 'translate-y-0 opacity-100 md:translate-y-0 md:scale-100' : 'translate-y-full opacity-100 md:-translate-y-1 md:scale-[0.98] md:opacity-0'}
            `}
            role="listbox"
          >
          <div className="mx-auto mt-2.5 h-1 w-11 shrink-0 rounded-full bg-neutral-200/90 md:hidden" aria-hidden />
          <div className="relative shrink-0 px-4 pt-2 pb-3 border-b border-neutral-100 bg-linear-to-b from-neutral-50/90 to-white md:pt-4">
            <p className="font-inter text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Delivery location
            </p>
            {resolvedLabel ? (
              <p
                className="font-inter mt-1.5 text-sm font-medium leading-snug text-neutral-900 line-clamp-2"
                title={resolvedLabel}
              >
                {resolvedLabel}
              </p>
            ) : (
              <p className="font-inter mt-1.5 text-sm text-neutral-500">
                Choose where we should deliver your order
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 md:flex-none md:overflow-visible">
          <div className="p-2 md:p-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoading || usingCurrent}
              className="font-inter group flex w-full items-center gap-3 rounded-xl bg-neutral-900 px-3.5 py-3 text-left text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 transition-colors group-hover:bg-white/15">
                <LocationIcon className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Use current location</span>
                <span className="mt-0.5 block text-xs font-normal text-white/65">
                  {isLoading || usingCurrent ? 'Getting your pin…' : 'GPS & pincode'}
                </span>
              </span>
            </button>
          </div>

          {isAuthenticated && (
            <>
              {savedAddressesLoading ? (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5">
                    <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-neutral-300" />
                    <p className="font-inter text-xs text-neutral-500">Loading your saved addresses…</p>
                  </div>
                </div>
              ) : savedAddresses.length > 0 ? (
                <div className="border-t border-neutral-100 px-2 pb-2">
                  <p className="font-inter px-2 pt-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    Saved addresses
                  </p>
                  <ul className="max-h-[40vh] space-y-0.5 overflow-y-auto overscroll-contain pr-0.5 md:max-h-46">
                    {savedAddresses.slice(0, 5).map((addr) => {
                      const label = formatAddressLabel(addr)
                      const pinStr = addr.pinCode != null ? String(addr.pinCode) : ''
                      return (
                        <li key={addr._id}>
                          <button
                            type="button"
                            onClick={() => handleUseSavedAddress(addr)}
                            className="font-inter flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100/80"
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                              <LocationIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 pt-0.5">
                              <span
                                className="block text-sm font-medium leading-snug text-neutral-800 line-clamp-2"
                                title={label}
                              >
                                {label || `Pin ${pinStr}`}
                              </span>
                              {pinStr ? (
                                <span className="mt-0.5 block text-[11px] text-neutral-400 tabular-nums">
                                  PIN {pinStr}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          )}
          </div>

          <div className="shrink-0 border-t border-neutral-100 bg-neutral-50/60 p-2">
            <button
              type="button"
              onClick={handleGoToAddress}
              className="font-inter flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 text-left text-sm font-medium text-neutral-800 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50/80 active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                  <LocationIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block">Manage addresses</span>
                  <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                    Add or edit saved locations
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-neutral-300" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          {error ? (
            <div className="shrink-0 border-t border-red-100 bg-red-50/90 px-4 py-3">
              <p className="font-inter text-xs font-medium leading-relaxed text-red-800">{error}</p>
            </div>
          ) : null}
        </div>
        </>
      )}
    </div>
  )
}
