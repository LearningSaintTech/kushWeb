import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/context/AuthContext'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../utils/constants'

export default function ProfileUpdatePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, authChecked, refreshUser, openAuthModal } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    pinCode: '',
  })
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authChecked) return
    if (!isAuthenticated) {
      openAuthModal(ROUTES.PROFILE_UPDATE)
      navigate(`${ROUTES.AUTH}?redirect=${encodeURIComponent(ROUTES.PROFILE_UPDATE)}`)
      return
    }
  }, [authChecked, isAuthenticated, navigate, openAuthModal])

  // Load profile into form
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    setLoading(true)
    setError(null)
    authService
      .getProfile()
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        if (cancelled || !data) return
        setForm({
          name: data.name ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          pinCode: data.pinCode ? String(data.pinCode) : '',
        })
        if (data.profileImage) setProfileImagePreview(data.profileImage)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isAuthenticated])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      const url = URL.createObjectURL(file)
      setProfileImagePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setProfileImageFile(null)
      setProfileImagePreview(user?.profileImage ?? null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', (form.name || '').trim())
      formData.append('email', (form.email || '').trim())
      formData.append('address', (form.address || '').trim())
      formData.append('city', (form.city || '').trim())
      const pin = (form.pinCode || '').trim()
      if (pin) formData.append('pinCode', pin)
      if (profileImageFile) formData.append('profileImage', profileImageFile)

      const res = await authService.updateProfile(formData)
      const updated = res?.data?.data ?? res?.data
      if (refreshUser) await refreshUser()
      setSuccess(true)
      setProfileImageFile(null)
      if (updated?.profileImage) setProfileImagePreview(updated.profileImage)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  if (!authChecked || (!isAuthenticated && authChecked)) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
        <p className="font-inter text-gray-500">Redirecting…</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
        <p className="font-inter text-gray-500">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black pt-24 pb-16">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <Link
          to={ROUTES.HOME}
          className="font-inter text-sm text-gray-500 hover:text-black uppercase tracking-wider mb-6 inline-block"
        >
          ← Back
        </Link>
        <h1 className="font-inter text-2xl sm:text-3xl font-bold uppercase tracking-wider text-black mb-2">
          Update Profile
        </h1>
        <p className="font-inter text-gray-600 text-sm mb-8">
          Edit your name, email, address and profile photo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="font-inter p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="font-inter p-3 rounded-lg bg-green-50 text-green-800 text-sm">
              Profile updated successfully.
            </div>
          )}

          {/* Profile image */}
          <div className="flex flex-col items-start gap-3">
            <label className="font-inter text-sm font-medium text-black uppercase tracking-wider">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 shrink-0">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <label className="font-inter text-sm cursor-pointer px-4 py-2 border border-black text-black hover:bg-gray-50 transition-colors">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="font-inter block text-sm font-medium text-black uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="font-inter w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="font-inter block text-sm font-medium text-black uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="font-inter w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          {/* <div>
            <label htmlFor="address" className="font-inter block text-sm font-medium text-black uppercase tracking-wider mb-1">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
              className="font-inter w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              placeholder="Street, area"
            />
          </div> */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="font-inter block text-sm font-medium text-black uppercase tracking-wider mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="font-inter w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label htmlFor="pinCode" className="font-inter block text-sm font-medium text-black uppercase tracking-wider mb-1">
                Pin Code
              </label>
              <input
                id="pinCode"
                name="pinCode"
                type="text"
                inputMode="numeric"
                value={form.pinCode}
                onChange={handleChange}
                className="font-inter w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Pin code"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="font-inter px-6 py-3 bg-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              to={ROUTES.HOME}
              className="font-inter px-6 py-3 border border-black text-black text-sm font-semibold uppercase tracking-wide hover:bg-gray-50 text-center transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
