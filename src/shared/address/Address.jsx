import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../../app/context/AuthContext'
import { addressService } from '../../services/address.service.js'
import { reverseGeocode, searchPlaces, getCurrentPosition } from '../../services/geo.service'
import { ROUTES } from '../../utils/constants'
import { setLocation } from '../../app/store/slices/locationSlice'
import GoogleMapPicker from '../components/GoogleMapPicker'
import { LocationIcon } from '../ui/icons'

function formatAddress(addr) {
  if (!addr) return ''
  const parts = [addr.addressLine, addr.city, addr.state, addr.pinCode].filter(Boolean)
  return parts.join(', ')
}

function TrashIcon({ className }) {
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function EditIcon({ className }) {
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L13 14l-4 1 1-4 8.5-8.5z"
      />
    </svg>
  )
}

export default function Address() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useAuth()

  const [addresses, setAddresses] = useState([])
  const [defaultAddressId, setDefaultAddressId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    countryCode: '+91',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    addressType: 'HOME',
    latitude: null,
    longitude: null,
  })
  const currentPincode = useSelector((s) => s?.location?.pincode)
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [mapGeocoding, setMapGeocoding] = useState(false)
  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [addressSearchResults, setAddressSearchResults] = useState([])
  const [addressSearchOpen, setAddressSearchOpen] = useState(false)
  const [addressSearchLoading, setAddressSearchLoading] = useState(false)
  const addressSearchRef = useRef(null)

  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [defaultRes, allRes] = await Promise.all([
        addressService.getDefaultAddress().catch(() => null),
        addressService.getAll({ page: 1, limit: 50 }),
      ])

      const defaultData = defaultRes?.data?.data ?? defaultRes?.data ?? null
      const allData = allRes?.data?.data ?? allRes?.data
      const arr = Array.isArray(allData)
        ? allData
        : Array.isArray(allData?.addresses)
          ? allData.addresses
          : Array.isArray(allData?.data)
            ? allData.data
            : []

      setAddresses(arr)
      setDefaultAddressId(defaultData?._id ?? null)
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load addresses')
      setAddresses([])
      setDefaultAddressId(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  const openCreateModal = () => {
    setModalMode('create')
    setEditingAddressId(null)
    setFormError(null)
    setAddressSearchQuery('')
    setAddressSearchResults([])
    setAddressSearchOpen(false)
    setForm({
      name: '',
      phoneNumber: '',
      countryCode: '+91',
      addressLine: '',
      city: '',
      state: '',
      pinCode: '',
      addressType: 'HOME',
      latitude: null,
      longitude: null,
    })
    setModalOpen(true)
  }

  const openEditModal = (addr) => {
    const type = addr?.addressType === 'WORK' ? 'OFFICE' : (addr?.addressType ?? 'HOME')
    setModalMode('edit')
    setEditingAddressId(addr?._id ?? null)
    setFormError(null)
    setForm({
      name: addr?.name ?? '',
      phoneNumber: addr?.phoneNumber ?? '',
      countryCode: addr?.countryCode ?? '+91',
      addressLine: addr?.addressLine ?? '',
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      pinCode: addr?.pinCode != null ? String(addr.pinCode) : '',
      addressType: type,
      latitude: addr?.latitude ?? null,
      longitude: addr?.longitude ?? null,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (formLoading) return
    setModalOpen(false)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleMapSelect = useCallback((lat, lng) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
  }, [])

  // Address search: debounced suggestions (Zomato/Swiggy style)
  useEffect(() => {
    if (!modalOpen || modalMode !== 'create') return
    const q = addressSearchQuery.trim()
    if (q.length < 2) {
      setAddressSearchResults([])
      setAddressSearchOpen(false)
      return
    }
    setAddressSearchLoading(true)
    const t = setTimeout(async () => {
      try {
        const results = await searchPlaces(q)
        setAddressSearchResults(Array.isArray(results) ? results : [])
        setAddressSearchOpen(true)
      } catch {
        setAddressSearchResults([])
      } finally {
        setAddressSearchLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [modalOpen, modalMode, addressSearchQuery])

  const handleSelectAddressSuggestion = useCallback((item) => {
    setForm((prev) => ({
      ...prev,
      addressLine: item.label || item.addressLine || prev.addressLine,
      city: item.city || prev.city,
      state: item.state || prev.state,
      pinCode: item.pincode ? String(item.pincode) : prev.pinCode,
      latitude: item.latitude ?? prev.latitude,
      longitude: item.longitude ?? prev.longitude,
    }))
    setAddressSearchQuery(item.label || '')
    setAddressSearchOpen(false)
    setAddressSearchResults([])
  }, [])

  const handleUseCurrentLocation = useCallback(async () => {
    setMapGeocoding(true)
    setFormError(null)
    try {
      const { latitude, longitude } = await getCurrentPosition()
      const res = await reverseGeocode(latitude, longitude)
      setForm((prev) => ({
        ...prev,
        addressLine: res?.addressLabel || prev.addressLine,
        city: res?.city || prev.city,
        state: res?.state || prev.state,
        pinCode: res?.pincode ? String(res.pincode) : prev.pinCode,
        latitude,
        longitude,
      }))
      setAddressSearchQuery(res?.addressLabel || '')
      setAddressSearchOpen(false)
    } catch (err) {
      setFormError(err?.message ?? 'Could not get location. Try search instead.')
    } finally {
      setMapGeocoding(false)
    }
  }, [])

  useEffect(() => {
    if (!addressSearchOpen) return
    const onOutside = (e) => {
      if (addressSearchRef.current && !addressSearchRef.current.contains(e.target)) setAddressSearchOpen(false)
    }
    document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [addressSearchOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    const pin = String(form.pinCode || '').trim().replace(/\D/g, '')
    if (
      !form.name?.trim() ||
      !form.addressLine?.trim() ||
      !form.city?.trim() ||
      !form.state?.trim() ||
      !pin
    ) {
      setFormError('Please fill name, address, city, state and pincode.')
      return
    }
    if (modalMode === 'create' && (form.latitude == null || form.longitude == null)) {
      setFormError('Please search for your area or use current location so we can confirm your delivery point.')
      return
    }

    const addressType = (form.addressType || 'HOME').toUpperCase()
    const payload = {
      name: form.name.trim(),
      phoneNumber: (form.phoneNumber || '').trim() || undefined,
      countryCode: (form.countryCode || '+91').trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pinCode: parseInt(pin, 10) || 0,
      addressType: addressType === 'WORK' ? 'OFFICE' : addressType,
      isDefault: false,
    }
    if (form.latitude != null && form.longitude != null) {
      payload.latitude = Number(form.latitude)
      payload.longitude = Number(form.longitude)
    }

    if (payload.pinCode <= 0) {
      setFormError('Please enter a valid pincode.')
      return
    }

    setFormLoading(true)
    try {
      if (modalMode === 'edit' && editingAddressId) {
        await addressService.update(editingAddressId, payload)
      } else {
        await addressService.create(payload)
      }
      await loadAddresses()
      setModalOpen(false)
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to save address.'
      setFormError(msg)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSetDefault = async (addr) => {
    const id = addr?._id
    if (!id) return
    try {
      await addressService.setDefault(id)
      await loadAddresses()
      const label = formatAddress(addr)
      dispatch(setLocation({ pincode: addr.pinCode ? String(addr.pinCode) : null, addressLabel: label || null }))
    } catch {
      // ignore
    }
  }

  const handleUseAsCurrent = (addr) => {
    const label = formatAddress(addr)
    dispatch(setLocation({ pincode: addr.pinCode ? String(addr.pinCode) : null, addressLabel: label || null }))
  }

  const handleDelete = async (id) => {
    // simple confirm to avoid accidental deletes
    if (!window.confirm('Delete this address?')) return
    try {
      await addressService.delete(id)
      await loadAddresses()
    } catch {
      // ignore
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className=" px-4 sm:px-6 md:px-8 py-12 sm:py-16 text-center ">
          <h1 className="text-xl sm:text-2xl font-bold text-black uppercase">Address Book</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Please sign in to manage your addresses.</p>
          <Link
            to={ROUTES.AUTH}
            className="mt-6 inline-block px-6 py-3 bg-black text-white text-sm font-medium uppercase hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen  bg-white pt-24 pb-12">
      <div className=" px-4 sm:px-6 md:px-8 lg:px-10 ">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-black uppercase">
            Address book
          </h1>
          <button
            type="button"
            onClick={openCreateModal}
            className="w-full sm:w-auto px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Add Address +
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading addresses…</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses added yet. Add your first address.</p>
        ) : (
          <div className="border border-[#E6E6E6] bg-white rounded-lg overflow-hidden">
            {/* Header row — visible from md up */}
            <div className="hidden md:flex border-b border-[#E6E6E6]">
              <div className="flex-1 px-4 lg:px-8 py-4 text-[11px] tracking-[0.28em] font-semibold uppercase text-gray-900">
                Address
              </div>
              <div className="w-[220px] lg:w-[260px] xl:w-[280px] shrink-0 px-4 lg:px-8 py-4 text-right text-[11px] tracking-[0.28em] uppercase text-gray-900 border-l border-[#E6E6E6] font-semibold">
                Edit/Delete
              </div>
            </div>
            {addresses.map((addr) => {
              const isDefault = defaultAddressId && defaultAddressId === addr._id
              const pinStr = addr.pinCode != null ? String(addr.pinCode) : ''
              const isCurrent = currentPincode && pinStr && String(currentPincode) === pinStr
              return (
                <div
                  key={addr._id}
                  className="flex flex-col md:flex-row border-b border-[#E6E6E6] last:border-b-0"
                >
                  {/* Address content */}
                  <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 md:py-10 md:min-h-[120px]">
                    <div className="max-w-[320px] pr-2">
                      <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                        {isDefault && (
                          <span className="inline-block text-[11px] font-semibold tracking-[0.28em] uppercase text-[#0E8635] bg-[#CBE1D2] px-2.5 py-1 rounded">
                            Default
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-block text-[11px] font-semibold tracking-[0.28em] uppercase text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                            Current location
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-gray-800 break-words">
                        {addr.name || 'Name'}
                      </p>
                      <p className="mt-2 text-[11px] leading-5 uppercase tracking-[0.04em] text-gray-500 whitespace-pre-line break-words">
                        {addr.addressLine}
                        {addr.addressLine && <br />}
                        {addr.city && <>
                          {addr.city}
                          <br />
                        </>}
                        {addr.state && <>
                          {addr.state}
                          <br />
                        </>}
                        {addr.pinCode && `${addr.pinCode}`}
                      </p>
                    </div>
                  </div>
                  {/* Edit/Delete + Set as current (below icons) */}
                  <div className="w-full md:w-[220px] lg:w-[260px] xl:w-[280px] shrink-0 border-t md:border-t-0 md:border-l border-[#E6E6E6] flex flex-col items-stretch md:items-center gap-3 md:gap-4 px-4 py-4 md:py-6 text-gray-500">
                    <div className="flex items-center justify-end md:justify-center gap-6">
                      <button
                        type="button"
                        onClick={() => handleDelete(addr._id)}
                        className="p-2 hover:text-black transition-colors"
                        aria-label="Delete address"
                      >
                        <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(addr)}
                        className="p-2 hover:text-black transition-colors"
                        aria-label="Edit address"
                      >
                        <EditIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr)}
                          className="w-full md:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.18em] hover:bg-gray-800 transition-colors"
                        >
                          Set as default
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleUseAsCurrent(addr)}
                          className="w-full md:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-800 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-gray-50 transition-colors"
                        >
                          Use this location
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit address modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 overflow-y-auto"
          onClick={closeModal}
          aria-hidden
        >
          <div
            className="w-full max-w-sm my-auto bg-white shadow-xl rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gray-800 truncate pr-2">
                {modalMode === 'edit' ? 'Edit Address' : 'New Address'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 -m-2 text-gray-500 hover:text-black text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-4 sm:px-5 py-4 space-y-3 max-h-[min(85vh,560px)] overflow-y-auto">
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              {modalMode === 'create' && (
                <>
                  <div className="relative" ref={addressSearchRef}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                      Search area, street, or pincode
                    </p>
                    <input
                      type="text"
                      value={addressSearchQuery}
                      onChange={(e) => setAddressSearchQuery(e.target.value)}
                      onFocus={() => addressSearchQuery.trim().length >= 2 && setAddressSearchOpen(true)}
                      placeholder="e.g. Sector 16B Bhangel, Greater Noida or 201318"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-gray-400"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={mapGeocoding}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-60"
                    >
                      <LocationIcon className="h-4 w-4 text-gray-500" />
                      {mapGeocoding ? 'Getting location…' : 'Use current location'}
                    </button>
                    {addressSearchOpen && addressSearchResults.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto border border-gray-200 bg-white rounded-lg shadow-lg py-1">
                        {addressSearchResults.map((item, idx) => (
                          <li key={`${item.label}-${item.pincode}-${idx}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectAddressSuggestion(item)}
                              className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex flex-col gap-0.5"
                            >
                              <span className="font-medium truncate">{item.label}</span>
                              {(item.city || item.pincode) && (
                                <span className="text-xs text-gray-500">
                                  {[item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {addressSearchLoading && (
                      <p className="text-xs text-gray-500 mt-1">Searching…</p>
                    )}
                  </div>
                  {form.latitude != null && form.longitude != null && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                        Confirm location on map
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Tap the map to adjust the pin. Delivery only in India.
                      </p>
                      <GoogleMapPicker
                        initialCenter={{ lat: form.latitude, lng: form.longitude }}
                        center={{ lat: form.latitude, lng: form.longitude }}
                        onSelect={handleMapSelect}
                        height={200}
                      />
                      {mapGeocoding && <p className="text-xs text-gray-500 mt-1">Getting address…</p>}
                    </div>
                  )}
                </>
              )}
              {modalMode === 'create' && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 pt-1">
                  Add more details
                </p>
              )}
              <div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Name"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400 min-w-0"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={form.addressLine}
                  onChange={(e) => handleFormChange('addressLine', e.target.value)}
                  placeholder="Address (area, street, flat, building)"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400 min-w-0"
                  required
                />
              </div>
              <div>
                <select
                  value={form.addressType}
                  onChange={(e) => handleFormChange('addressType', e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none bg-transparent text-gray-700 min-w-0"
                  aria-label="Address type"
                >
                  <option value="HOME">Home</option>
                  <option value="OFFICE">Office</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleFormChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400 min-w-0"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => handleFormChange('state', e.target.value)}
                  placeholder="State"
                  className="flex-1 min-w-[100px] border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
                  required
                />
                <input
                  type="text"
                  value={form.pinCode}
                  onChange={(e) =>
                    handleFormChange(
                      'pinCode',
                      e.target.value.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                  placeholder="PIN code"
                  className="w-24 sm:w-32 border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    handleFormChange(
                      'phoneNumber',
                      e.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  placeholder="Phone number"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400 min-w-0"
                />
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="mt-4 w-full bg-black text-white text-xs font-semibold uppercase tracking-[0.15em] py-3 hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {formLoading
                  ? modalMode === 'edit'
                    ? 'Saving...'
                    : 'Adding...'
                  : modalMode === 'edit'
                    ? 'Save Address'
                    : 'Add Address'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

