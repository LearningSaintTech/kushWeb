import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { addressService } from '../../services/address.service.js'
import { ROUTES } from '../../utils/constants'

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
  })
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

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
    setForm({
      name: '',
      phoneNumber: '',
      countryCode: '+91',
      addressLine: '',
      city: '',
      state: '',
      pinCode: '',
      addressType: 'HOME',
    })
    setModalOpen(true)
  }

  const openEditModal = (addr) => {
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
      addressType: addr?.addressType ?? 'HOME',
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

    const payload = {
      name: form.name.trim(),
      phoneNumber: (form.phoneNumber || '').trim() || undefined,
      countryCode: (form.countryCode || '+91').trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pinCode: parseInt(pin, 10) || 0,
      addressType: form.addressType || 'HOME',
      isDefault: false,
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

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefault(id)
      await loadAddresses()
    } catch {
      // ignore
    }
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
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-black uppercase">Address Book</h1>
          <p className="mt-2 text-gray-600">Please sign in to manage your addresses.</p>
          <Link
            to={ROUTES.AUTH}
            className="mt-6 inline-block px-6 py-3 bg-black text-white uppercase hover:bg-gray-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
        <div className="flex items-center justify-end mb-6">
          <button
            type="button"
            onClick={openCreateModal}
            className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] bg-black text-white hover:bg-gray-800 transition-colors"
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
          <div className="border border-[#E6E6E6] bg-white">
            {/* Header row */}
            <div className="flex border-b border-[#E6E6E6]">
              <div className="flex-1 px-8 py-4 text-[11px] tracking-[0.28em] font-semibold uppercase text-gray-900">
                Address
              </div>
              <div className="w-[220px] px-8 py-4 text-right text-[11px] tracking-[0.28em] uppercase text-gray-900 border-l border-[#E6E6E6] font-semibold">
                Edit/Delete
              </div>
            </div>
            {addresses.map((addr) => {
              const isCurrent = defaultAddressId && defaultAddressId === addr._id
              return (
                <div
                  key={addr._id}
                  className="flex border-b border-[#E6E6E6] last:border-b-0"
                >
                  {/* Left column */}
                  <div className="relative flex-1 px-8 py-10 min-h-[160px]">
                    <div className="max-w-[320px]">
                      {isCurrent && (
                        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-gray-900 mb-4">
                          Current Address
                        </p>
                      )}
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-gray-800">
                        {addr.name || 'Name'}
                      </p>
                      <p className="mt-2 text-[11px] leading-5 uppercase tracking-[0.04em] text-gray-500 whitespace-pre-line">
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

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr._id)}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-10 py-3 bg-black text-white text-[11px] font-semibold uppercase tracking-[0.18em] hover:bg-gray-800 transition-colors"
                      >
                        Set as current address
                      </button>
                    )}
                  </div>
                  {/* Right column */}
                  <div className="w-[220px] border-l border-[#E6E6E6] flex items-center justify-center gap-6 text-gray-500">
                    <button
                      type="button"
                      onClick={() => handleDelete(addr._id)}
                      className="p-1 hover:text-black transition-colors"
                      aria-label="Delete address"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(addr)}
                      className="p-1 hover:text-black transition-colors"
                      aria-label="Edit address"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeModal}
          aria-hidden
        >
          <div
            className="w-full max-w-sm bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-800">
                {modalMode === 'edit' ? 'Edit Address' : 'New Address'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 text-gray-500 hover:text-black"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="First name"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={form.addressLine}
                  onChange={(e) => handleFormChange('addressLine', e.target.value)}
                  placeholder="Address"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <select
                  value={form.addressType}
                  onChange={(e) => handleFormChange('addressType', e.target.value)}
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none bg-transparent text-gray-700"
                  aria-label="Address type"
                >
                  <option value="HOME">Address type: Home</option>
                  <option value="WORK">Address type: Work</option>
                  <option value="OTHER">Address type: Other</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleFormChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => handleFormChange('state', e.target.value)}
                  placeholder="State"
                  className="flex-1 border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
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
                  className="w-32 border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
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
                  className="w-full border-b border-gray-300 py-2 text-sm outline-none placeholder:text-gray-400"
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

