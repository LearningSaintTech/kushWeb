import { useState, useRef, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { setLocation, setPincodeOnly, setLoading, setError } from '../../app/store/slices/locationSlice'
import { getCurrentLocationPincode } from '../../services/geo.service'
import { LocationIcon } from '../ui/icons'

const PINCODE_REGEX = /^\d{4,6}$/

export default function LocationPicker({ scrolled, className = '', compact = false }) {
  const dispatch = useDispatch()
  const pincode = useSelector((s) => s.location?.pincode)
  const addressLabel = useSelector((s) => s.location?.addressLabel)
  const recentPincodes = useSelector((s) => s.location?.recentPincodes ?? [])
  const suggestedPincodes = useSelector((s) => s.location?.suggestedPincodes ?? [])
  const isLoading = useSelector((s) => s.location?.isLoading ?? false)
  const error = useSelector((s) => s.location?.error)

  const [open, setOpen] = useState(false)
  const [panelAnimateOpen, setPanelAnimateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [usingCurrent, setUsingCurrent] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const resolvedLabel = addressLabel ||
    (pincode && [...(recentPincodes || []), ...(suggestedPincodes || [])].find((r) => r.pincode === pincode)?.label) ||
    (pincode ? `Pin ${pincode}` : null)

  const displayPlaceholder = (() => {
    if (isLoading || usingCurrent) return 'Detecting location...'
    if (error) return 'Select location'
    return open ? 'Search area or pincode' : 'Select location'
  })()

  const displayValue = open ? query : (resolvedLabel || '')
  const showPlaceholder = open && !query && !resolvedLabel

  const allSuggestions = useMemo(() => {
    const recent = recentPincodes ?? []
    const suggested = suggestedPincodes ?? []
    const seen = new Set()
    return [...recent, ...suggested].filter((item) => {
      const key = item.pincode
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [recentPincodes, suggestedPincodes])

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allSuggestions
    return allSuggestions.filter(
      (item) =>
        (item.label && item.label.toLowerCase().includes(q)) ||
        (item.pincode && String(item.pincode).includes(q))
    )
  }, [query, allSuggestions])

  const typedPincode = useMemo(() => {
    const trimmed = query.trim().replace(/\s/g, '')
    return trimmed && PINCODE_REGEX.test(trimmed) ? trimmed : null
  }, [query])

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
        setQuery('')
      } else {
        dispatch(setError('Address could not be resolved. Please choose from the list.'))
      }
    } catch (err) {
      dispatch(setError(err?.message ?? 'Could not get location'))
    } finally {
      setUsingCurrent(false)
      dispatch(setLoading(false))
    }
  }

  const handleSelect = (item) => {
    dispatch(setPincodeOnly({ pincode: item.pincode, label: item.label }))
    setOpen(false)
    setQuery('')
  }

  const handleSelectManualPincode = (pin) => {
    dispatch(setPincodeOnly({ pincode: pin, label: `Pin ${pin}` }))
    setOpen(false)
    setQuery('')
  }

  const handleInputFocus = () => {
    setOpen(true)
    if (!query && resolvedLabel) setQuery(resolvedLabel)
  }

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
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
      <div
        className={`flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-full px-2 py-1 md:gap-[0.83vw] md:px-[0.83vw] md:py-[0.3vw] ${bgClass} ${
          compact ? 'w-full md:w-[18.1vw]' : ''
        } ${error ? 'ring-1 ring-amber-400/80' : ''}`}
        onClick={() => inputRef.current?.focus()}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Delivery location"
      >
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-[1.8vw] md:w-[1.8vw] ${iconBgClass}`}>
          <LocationIcon className={`h-4 w-4 md:h-5 md:w-5 ${iconClass}`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={displayPlaceholder}
          className={`font-inter min-w-0 flex-1 truncate border-none bg-transparent text-left text-xs outline-none placeholder:opacity-70 md:text-[0.83vw] ${textClass}`}
          aria-autocomplete="list"
          aria-controls="location-listbox"
          aria-activedescendant={undefined}
        />
        <span className={`inline-flex shrink-0 ${textClass} transition-transform duration-200 ease-out`}>
          {open ? <FaChevronUp className="h-4 w-4 md:h-5 md:w-5" /> : <FaChevronDown className="h-4 w-4 md:h-5 md:w-5" />}
        </span>
      </div>

      {open && (
        <div
          id="location-listbox"
          className={`absolute left-0 top-full z-[60] mt-1 min-w-[240px] max-w-[min(320px,90vw)] rounded-xl border border-gray-200 bg-white py-2 shadow-lg transition-all duration-200 ease-out origin-top-left ${
            panelAnimateOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'
          }`}
          role="listbox"
        >
          <div className="border-b border-gray-100 px-3 pb-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoading || usingCurrent}
              className="font-inter flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              <LocationIcon className="h-4 w-4 shrink-0 text-gray-500" />
              Use current location
            </button>
          </div>

          {/* Manual pincode: user typed a valid pincode */}
          {typedPincode && (
            <div className="border-b border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => handleSelectManualPincode(typedPincode)}
                className="font-inter flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="text-gray-500">Use pincode</span>
                <span className="font-medium">Pin {typedPincode}</span>
              </button>
            </div>
          )}

          {/* Filtered suggestions (Recent + Suggested) */}
          <div className="max-h-[200px] overflow-y-auto px-3 py-2">
            <p className="font-inter mb-1 px-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {query.trim() ? 'Suggestions' : 'Recent & suggested'}
            </p>
            {filteredSuggestions.length > 0 ? (
              <ul className="space-y-0.5">
                {filteredSuggestions.map((item) => (
                  <li key={item.pincode}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="font-inter w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-inter px-3 py-2 text-sm text-gray-500">
                {query.trim() ? 'No matches. Type a pincode (e.g. 110001) to add.' : 'No recent or suggested locations.'}
              </p>
            )}
          </div>

          {error && (
            <p className="font-inter px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
