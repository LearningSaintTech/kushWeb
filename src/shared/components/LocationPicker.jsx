import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { setLocation, setLoading, setError } from '../../app/store/slices/locationSlice'
import { getCurrentLocationPincode } from '../../services/geo.service'
import { LocationIcon } from '../ui/icons'
import { ROUTES } from '../../utils/constants'

export default function LocationPicker({ scrolled, className = '', compact = false }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const pincode = useSelector((s) => s.location?.pincode)
  const addressLabel = useSelector((s) => s.location?.addressLabel)
  const isLoading = useSelector((s) => s.location?.isLoading ?? false)
  const error = useSelector((s) => s.location?.error)

  const [open, setOpen] = useState(false)
  const [panelAnimateOpen, setPanelAnimateOpen] = useState(false)
  const [usingCurrent, setUsingCurrent] = useState(false)
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
        dispatch(setLocation({ pincode: pin, addressLabel: label }))
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
        <div
          id="location-listbox"
          className={`absolute left-0 top-full z-[60] mt-1 min-w-[240px] max-w-[min(320px,90vw)] rounded-xl border border-gray-200 bg-white py-2 shadow-lg transition-all duration-200 ease-out origin-top-left ${
            panelAnimateOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
          }`}
          role="listbox"
        >
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoading || usingCurrent}
            className="font-inter flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            <LocationIcon className="h-4 w-4 shrink-0 text-gray-500" />
            Use current location
          </button>
          <button
            type="button"
            onClick={handleGoToAddress}
            className="font-inter flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <LocationIcon className="h-4 w-4" />
            </span>
            <span>Go to address</span>
            <span className="ml-auto text-xs text-gray-400">Choose existing or add new</span>
          </button>
          {error && <p className="font-inter px-4 py-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
