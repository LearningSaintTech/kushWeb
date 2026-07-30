import { useEffect, useRef, useState } from 'react'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import { useCommunityRole } from '../../hooks/useCommunityRole'
import { CREATOR_PROFILE } from '../../data/mockCreator'
import {
  communityProfileService,
  getCommunityProfileErrorMessage,
} from '../../../../services/communityProfile.service'
import { normalizePhoneForApi, mapGenderToApi, mapGenderFromApi } from '../../api/communityProfileMappers'
import { debugLog } from '../../../../utils/debugLog'

const CATEGORIES = [
  { value: 'creator', label: 'Creator' },
  { value: 'designer', label: 'Designer' },
]

const GENDERS = [
  { value: 'prefer-not', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'trans', label: 'Trans' },
]

const fieldClass =
  'w-full rounded-2xl border-0 bg-[#f3f3f3] px-4 py-3.5 font-inter text-sm text-black outline-none transition focus:ring-2 focus:ring-black/10'

const labelClass =
  'mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400'

/**
 * Mobile-style Edit Profile panel for community creator.
 */
export default function CreatorEditProfile({ onBack, onSaved }) {
  const fileRef = useRef(null)
  const { profile, applyProfile, refresh, selectRole } = useCommunityProfile()
  const role = useCommunityRole()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('creator')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('prefer-not')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [genderOpen, setGenderOpen] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const nextName = profile?.name || CREATOR_PROFILE.name
    const nextUsername = (profile?.username || CREATOR_PROFILE.handle || '').replace(/^@/, '')
    const nextBio = profile?.creatorBio || CREATOR_PROFILE.bio || ''
    const nextWebsite = profile?.creatorWebsite || CREATOR_PROFILE.website || ''
    const nextAvatar = profile?.profileImage || CREATOR_PROFILE.avatar
    const nextCategory =
      profile?.isDesigner || role === 'designer' ? 'designer' : 'creator'
    const nextEmail = profile?.email || ''
    const nextPhone = profile?.phoneNumber || ''
    const nextGender = mapGenderFromApi(profile?.gender) || 'prefer-not'

    setName(nextName)
    setUsername(nextUsername)
    setBio(nextBio)
    setWebsite(nextWebsite)
    setCategory(nextCategory)
    setEmail(nextEmail)
    setPhone(nextPhone)
    setGender(nextGender)
    setPhotoPreview(nextAvatar)
    setPhotoFile(null)
    setError(null)
  }, [profile, role])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith?.('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const pickPhoto = () => fileRef.current?.click()

  const onFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (photoPreview?.startsWith?.('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSave = async () => {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!cleanUsername) {
      setError('Username is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      debugLog('[CommunityProfile] edit profile save', {
        name: name.trim(),
        username: cleanUsername,
        category,
        hasPhoto: photoFile instanceof File,
      })

      const currentCategory =
        profile?.isDesigner || role === 'designer' ? 'designer' : 'creator'
      if (category !== currentCategory) {
        await selectRole(category)
      }

      if (photoFile instanceof File) {
        const fd = new FormData()
        fd.append('profileImage', photoFile)
        applyProfile(await communityProfileService.patchCreatorPhoto(fd))
      }

      applyProfile(
        await communityProfileService.patchCreatorBasic({
          name: name.trim(),
          username: cleanUsername,
        }),
      )

      applyProfile(
        await communityProfileService.patchCreatorAbout({
          bio: bio.trim().slice(0, 160) || undefined,
          website: website.trim() || undefined,
        }),
      )

      const phoneNumber = normalizePhoneForApi(phone)
      applyProfile(
        await communityProfileService.patchCreatorPrivate({
          email: email.trim() || undefined,
          phoneNumber,
          countryCode: phoneNumber ? '+91' : undefined,
          gender: mapGenderToApi(gender),
        }),
      )

      await refresh()
      onSaved?.()
    } catch (err) {
      setError(getCommunityProfileErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const categoryLabel =
    CATEGORIES.find((item) => item.value === category)?.label || 'Creator'
  const genderLabel =
    GENDERS.find((item) => item.value === gender)?.label || 'Prefer not to say'

  return (
    <div className="w-full max-w-[420px] rounded-[1.75rem] bg-white px-5 pb-8 pt-5 shadow-[0_8px_28px_rgba(0,0,0,0.05)] sm:px-7">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-black transition hover:bg-neutral-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="font-inter text-lg font-bold text-black">Edit Profile</h2>
      </div>

      <div className="mt-8 flex flex-col items-center">
        <div className="relative">
          <div className="h-[7.5rem] w-[7.5rem] overflow-hidden rounded-full bg-neutral-100 sm:h-32 sm:w-32">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <button
            type="button"
            onClick={pickPhoto}
            aria-label="Change photo"
            className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#ff3b4a] text-white shadow-md transition hover:bg-[#e83341]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.055-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <button
          type="button"
          onClick={pickPhoto}
          className="mt-3 cursor-pointer font-inter text-sm font-semibold text-black transition hover:text-neutral-600"
        >
          Change Photo
        </button>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Username</span>
          <input
            value={username ? `@${username.replace(/^@/, '')}` : ''}
            onChange={(e) =>
              setUsername(e.target.value.replace(/^@/, '').replace(/\s/g, '').slice(0, 30))
            }
            className={fieldClass}
            autoComplete="username"
            maxLength={31}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Bio</span>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            className={`${fieldClass} resize-none leading-relaxed`}
          />
          <span className="mt-1 block text-right font-inter text-[11px] text-neutral-400">
            {bio.length}/160
          </span>
        </label>

        <label className="block">
          <span className={labelClass}>Website</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={fieldClass}
            placeholder="yoursite.com"
            inputMode="url"
          />
        </label>

        <div className="relative block">
          <span className={labelClass}>Category</span>
          <button
            type="button"
            onClick={() => {
              setCategoryOpen((open) => !open)
              setGenderOpen(false)
            }}
            className={`${fieldClass} flex cursor-pointer items-center justify-between text-left`}
            aria-expanded={categoryOpen}
            aria-haspopup="listbox"
          >
            <span>{categoryLabel}</span>
            <svg
              className={`h-4 w-4 text-neutral-400 transition ${categoryOpen ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          {categoryOpen ? (
            <ul
              role="listbox"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
            >
              {CATEGORIES.map((item) => (
                <li key={item.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={category === item.value}
                    onClick={() => {
                      setCategory(item.value)
                      setCategoryOpen(false)
                    }}
                    className={`flex w-full cursor-pointer px-4 py-3 text-left font-inter text-sm transition hover:bg-neutral-50 ${
                      category === item.value ? 'font-semibold text-black' : 'text-neutral-600'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="pt-3">
          <h3 className="font-inter text-base font-bold text-black">Private Information</h3>

          <label className="mt-4 block">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </label>

          <label className="mt-4 block">
            <span className={labelClass}>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 16))}
              className={fieldClass}
              placeholder="9876543210"
              autoComplete="tel"
            />
          </label>

          <div className="relative mt-4 block">
            <span className={labelClass}>Gender</span>
            <button
              type="button"
              onClick={() => {
                setGenderOpen((open) => !open)
                setCategoryOpen(false)
              }}
              className={`${fieldClass} flex cursor-pointer items-center justify-between text-left`}
              aria-expanded={genderOpen}
              aria-haspopup="listbox"
            >
              <span>{genderLabel}</span>
              <svg
                className={`h-4 w-4 text-neutral-400 transition ${genderOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            {genderOpen ? (
              <ul
                role="listbox"
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
              >
                {GENDERS.map((item) => (
                  <li key={item.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={gender === item.value}
                      onClick={() => {
                        setGender(item.value)
                        setGenderOpen(false)
                      }}
                      className={`flex w-full cursor-pointer px-4 py-3 text-left font-inter text-sm transition hover:bg-neutral-50 ${
                        gender === item.value ? 'font-semibold text-black' : 'text-neutral-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 font-inter text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full cursor-pointer rounded-xl bg-black py-3.5 font-inter text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
