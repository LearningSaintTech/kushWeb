import { useEffect, useRef, useState } from 'react'
import { useCommunityProfile } from '../../context/CommunityProfileContext'
import { useCommunityRole } from '../../hooks/useCommunityRole'
import { requestCommunityProfileRefresh } from '../../hooks/useCommunitySocialProfile'
import whiteBg from '../../../../assets/images/community/whitebg.png'
import {
  communityProfileService,
  getCommunityProfileErrorMessage,
  normalizePhoneForApi,
  normalizeExperienceDate,
  buildDesignerLinksBody,
  hydrateEditProfileForm,
  mapGenderToApi,
  isDesignerRejected,
} from '../../../../services/communityProfile.service'
import { debugLog } from '../../../../utils/debugLog'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const CATEGORIES = [
  { value: 'designer', label: 'Designer' },
  { value: 'creator', label: 'Creator' },
]

const GENDERS = [
  { value: 'prefer-not', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'trans', label: 'Trans' },
]

const YEARS = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i))

const fieldClass =
  'w-full rounded-2xl border-0 bg-[#f3f3f3] px-4 py-3 font-inter text-sm text-black outline-none transition focus:ring-2 focus:ring-black/15'

const labelClass =
  'mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500'

function CameraIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.055-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

/**
 * Full Edit Profile panel supporting all details (Cover photo, Avatar, Essentials,
 * Bio, Skills, Experience, Education, Social Hubs, and Private Information).
 */
export default function CreatorEditProfile({ onBack, onSaved }) {
  const photoFileRef = useRef(null)
  const coverFileRef = useRef(null)
  const { profile, applyProfile, refresh, selectRole } = useCommunityProfile()
  const role = useCommunityRole()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [location, setLocation] = useState('')
  const [tagline, setTagline] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('designer')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('prefer-not')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [genderOpen, setGenderOpen] = useState(false)

  // Media
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')

  // Multi-item sections
  const [skills, setSkills] = useState([])
  const [experience, setExperience] = useState([])
  const [education, setEducation] = useState([])
  const [hubs, setHubs] = useState({
    dribbble: { enabled: false, title: 'Dribbble', url: '' },
    behance: { enabled: false, title: 'Behance', url: '' },
    twitter: { enabled: false, title: 'Twitter', url: '' },
    website: { enabled: false, title: 'Website', url: '' },
  })
  const [customLinks, setCustomLinks] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Prefill on load from current profile
  useEffect(() => {
    const fallbackCategory = role === 'designer' ? 'designer' : 'creator'
    const hydrated = hydrateEditProfileForm(profile, { category: fallbackCategory })

    setName(hydrated.name)
    setUsername(hydrated.username)
    setLocation(hydrated.location)
    setTagline(hydrated.tagline)
    setBio(hydrated.bio)
    setWebsite(hydrated.website)
    setCategory(hydrated.category)
    setEmail(hydrated.email)
    setPhone(hydrated.phone)
    setGender(hydrated.gender)
    setPhotoPreview(hydrated.photoPreview)
    setCoverPreview(hydrated.coverPreview || whiteBg)
    setSkills(hydrated.skills)
    setExperience(hydrated.experience)
    setEducation(hydrated.education)
    setHubs(hydrated.hubs)
    setCustomLinks(hydrated.customLinks)
    setPhotoFile(null)
    setCoverFile(null)
    setError(null)
  }, [profile, role])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [photoPreview, coverPreview])

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const onCoverChange = (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setError(null)
  }

  // Skills handlers
  const addSkill = () => {
    setSkills((prev) => [...prev, { id: uid(), name: '', level: 50 }])
  }
  const updateSkill = (id, patch) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const removeSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
  }
  const bumpSkill = (id, delta) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, level: Math.min(100, Math.max(0, s.level + delta)) } : s,
      ),
    )
  }

  // Experience handlers
  const addExperience = () => {
    setExperience((prev) => [
      ...prev,
      {
        id: uid(),
        jobTitle: '',
        company: '',
        startYear: '',
        endYear: '',
        isPresent: false,
        description: '',
      },
    ])
  }
  const updateExperience = (id, patch) => {
    setExperience((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const removeExperience = (id) => {
    setExperience((prev) => prev.filter((r) => r.id !== id))
  }

  // Education handlers
  const addEducation = () => {
    setEducation((prev) => [
      ...prev,
      {
        id: uid(),
        degree: '',
        institution: '',
        field: '',
        dateRange: '',
        currentlyStudying: false,
      },
    ])
  }
  const updateEducation = (id, patch) => {
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  const removeEducation = (id) => {
    setEducation((prev) => prev.filter((e) => e.id !== id))
  }

  // Custom links handlers
  const addCustomLink = () => {
    setCustomLinks((prev) => [...prev, { id: uid(), title: '', url: '' }])
  }
  const updateCustomLink = (id, patch) => {
    setCustomLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  const removeCustomLink = (id) => {
    setCustomLinks((prev) => prev.filter((l) => l.id !== id))
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
      const nameOk = /^[A-Za-z][A-Za-z ]+$/.test(name.trim()) && name.trim().length >= 2
      if (!nameOk) {
        setError('Name must be at least 2 letters (A–Z and spaces only).')
        setSaving(false)
        return
      }
      const usernameRe =
        category === 'designer'
          ? /^[a-z][a-z0-9_]{2,19}$/
          : /^[a-z][a-z0-9_]{2,29}$/
      if (!usernameRe.test(cleanUsername)) {
        setError(
          category === 'designer'
            ? 'Username must be 3–20 chars, start with a letter, and use only a–z, 0–9, _.'
            : 'Username must be 3–30 chars, start with a letter, and use only a–z, 0–9, _.',
        )
        setSaving(false)
        return
      }

      debugLog('[CommunityProfile] edit profile save', {
        name: name.trim(),
        username: cleanUsername,
        category,
        hasPhoto: photoFile instanceof File,
        hasCover: coverFile instanceof File,
      })

      // Switch category if changed
      const currentCategory =
        profile?.isDesigner || role === 'designer' ? 'designer' : 'creator'
      if (category !== currentCategory) {
        await selectRole(category)
      }

      // 1. Photo uploads
      const hasPhoto = photoFile instanceof File
      const hasCover = coverFile instanceof File
      if (hasPhoto || hasCover) {
        const fd = new FormData()
        if (hasPhoto) fd.append('profileImage', photoFile)
        if (hasCover) fd.append('coverImage', coverFile)

        if (category === 'designer' || profile?.isDesigner || hasCover) {
          applyProfile(await communityProfileService.patchDesignerScene(fd))
        } else if (hasPhoto) {
          applyProfile(await communityProfileService.patchCreatorPhoto(fd))
        }
      }

      // 2. Designer profile updates
      if (category === 'designer' || profile?.isDesigner) {
        applyProfile(
          await communityProfileService.patchDesignerEssentials({
            name: name.trim(),
            username: cleanUsername,
            location: location.trim() || undefined,
          }),
        )

        applyProfile(
          await communityProfileService.patchDesignerStory({
            tagline: tagline.trim().slice(0, 80) || undefined,
            bio: bio.trim().slice(0, 300) || undefined,
          }),
        )

        const validSkills = skills
          .filter((s) => s?.name?.trim())
          .map((s) => ({
            name: s.name.trim(),
            proficiency: Math.min(100, Math.max(0, Number(s.level) || 0)),
          }))
        if (validSkills.length > 0) {
          applyProfile(await communityProfileService.patchDesignerSkills(validSkills))
        }

        const validExperience = experience
          .filter((r) => r?.jobTitle?.trim() || r?.company?.trim())
          .map((r) => {
            const isPresent = Boolean(r.isPresent || r.endYear === 'Present')
            return {
              title: r.jobTitle?.trim() || '',
              company: r.company?.trim() || '',
              startDate: normalizeExperienceDate(r.startYear),
              endDate: isPresent ? '' : normalizeExperienceDate(r.endYear),
              isPresent,
              description: r.description?.trim() || '',
            }
          })
        if (validExperience.length > 0) {
          applyProfile(await communityProfileService.patchDesignerExperience(validExperience))
        }

        const validEducation = education
          .filter((e) => e?.degree?.trim() || e?.institution?.trim())
          .map((e) => {
            const isPresent = Boolean(e.currentlyStudying || e.isPresent)
            const range = String(e.dateRange || '').trim()
            let startDate = ''
            let endDate = ''
            if (range.includes('-')) {
              const [a, b] = range.split('-').map((p) => p.trim())
              startDate = a || ''
              endDate = b && b.toLowerCase() !== 'present' ? b : ''
            } else if (range) {
              startDate = range
            }
            return {
              degree: e.degree?.trim() || '',
              institution: e.institution?.trim() || '',
              fieldOfStudy: e.field?.trim() || '',
              startDate,
              endDate: isPresent ? '' : endDate,
              isPresent,
            }
          })
        if (validEducation.length > 0) {
          applyProfile(await communityProfileService.patchDesignerEducation(validEducation))
        }

        const validLinks = buildDesignerLinksBody({ hubs, customLinks })
        if (validLinks.length > 0) {
          applyProfile(await communityProfileService.patchDesignerLinks(validLinks))
        }

        // Re-submit application to admin verification if currently rejected or incomplete
        const isRejectedStatus =
          isDesignerRejected(profile) ||
          String(profile?.designerVerificationStatus || '').toLowerCase() === 'rejected' ||
          String(profile?.verificationStatus || '').toLowerCase() === 'rejected'

        if (isRejectedStatus) {
          try {
            debugLog('[CommunityProfile] re-submitting rejected designer profile')
            applyProfile(await communityProfileService.resubmitDesigner())
          } catch (resubErr) {
            debugLog('[CommunityProfile] resubmitDesigner fallback to completeDesigner', resubErr)
            try {
              applyProfile(await communityProfileService.completeDesigner())
            } catch (compErr) {
              debugLog('[CommunityProfile] completeDesigner fallback failed', compErr)
            }
          }
        } else if (
          profile?.designerOnboardingStep &&
          profile.designerOnboardingStep !== 'completed' &&
          !profile?.isDesignerVerified
        ) {
          try {
            applyProfile(await communityProfileService.completeDesigner())
          } catch (compErr) {
            debugLog('[CommunityProfile] completeDesigner failed', compErr)
          }
        }
      } else {
        // Creator profile updates
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
        if (phoneNumber && !/^[6-9]\d{9}$/.test(phoneNumber)) {
          setError('Enter a valid 10-digit Indian mobile number.')
          setSaving(false)
          return
        }
        applyProfile(
          await communityProfileService.patchCreatorPrivate({
            email: email.trim() || undefined,
            phoneNumber,
            countryCode: phoneNumber ? '+91' : undefined,
            gender: mapGenderToApi(gender),
          }),
        )
      }

      await refresh()
      requestCommunityProfileRefresh()
      onSaved?.()
    } catch (err) {
      setError(getCommunityProfileErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const categoryLabel =
    CATEGORIES.find((item) => item.value === category)?.label || 'Designer'
  const genderLabel =
    GENDERS.find((item) => item.value === gender)?.label || 'Prefer not to say'

  return (
    <div className="scrollbar-hide flex max-h-[min(94vh,860px)] w-full max-w-[440px] flex-col overflow-y-auto rounded-[1.75rem] bg-white pb-8 shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
      {/* Top sticky header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
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
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-xl bg-black px-4 py-2 font-inter text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Cover Photo Banner & Avatar Section */}
      <div className="relative">
        <div className="group relative h-36 w-full overflow-hidden bg-neutral-900 sm:h-40">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-400">
              <CameraIcon className="h-8 w-8 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            aria-label="Change cover photo"
            title="Change cover photo"
            className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 font-inter text-xs font-medium text-white shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-black"
          >
            <CameraIcon className="h-3.5 w-3.5" />
            <span>Change Cover</span>
          </button>
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onCoverChange}
          />
        </div>

        {/* Circular Avatar */}
        <div className="relative -mt-14 flex flex-col items-center px-5">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-neutral-100 shadow-md sm:h-28 sm:w-28">
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-neutral-400">
                  <CameraIcon className="h-8 w-8 opacity-50" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => photoFileRef.current?.click()}
              aria-label="Change photo"
              title="Change profile photo"
              className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ff3b4a] text-white shadow-md transition hover:scale-105 hover:bg-[#e83341]"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
            <input
              ref={photoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
            />
          </div>
          <button
            type="button"
            onClick={() => photoFileRef.current?.click()}
            className="mt-2 cursor-pointer font-inter text-xs font-semibold text-neutral-700 transition hover:text-black"
          >
            Change Profile Photo
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="mt-6 space-y-6 px-5 sm:px-7">
        {(category === 'designer' || profile?.isDesigner) && isDesignerRejected(profile) && (
          <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-[#FFF5F5] via-[#FEE2E2]/60 to-[#FFF5F5] p-4 text-left shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-inter text-xs font-bold text-red-950">Application Rejected</p>
                  <span className="rounded-full bg-red-200/90 px-2 py-0.5 font-inter text-[9px] font-bold text-red-900">
                    RE-APPLYING
                  </span>
                </div>
                {profile?.designerRejectionReason ? (
                  <div className="mt-1.5 rounded-lg border border-red-200 bg-white/80 p-2">
                    <p className="font-inter text-xs text-red-900">
                      <span className="font-bold text-red-950">Feedback: </span>
                      {profile.designerRejectionReason}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 font-inter text-xs text-red-800/90 leading-relaxed">
                    Please review and update your information. Clicking Save will re-submit your profile for admin verification.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ——— Section: Essentials ——— */}
        <div className="space-y-4">
          <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
            The Essentials
          </h3>

          <label className="block">
            <span className={labelClass}>Full Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className={labelClass}>Username</span>
            <div className={`flex items-center overflow-hidden ${fieldClass} !px-0`}>
              <span className="select-none pl-4 font-inter text-sm text-neutral-400" aria-hidden>
                @
              </span>
              <input
                value={String(username || '').replace(/^@/, '')}
                onChange={(e) =>
                  setUsername(
                    e.target.value.replace(/^@/, '').replace(/\s/g, '').slice(0, 30),
                  )
                }
                className="min-w-0 flex-1 border-0 bg-transparent py-0 pl-1 pr-4 font-inter text-sm text-black outline-none"
                autoComplete="username"
                maxLength={30}
                placeholder="username"
              />
            </div>
          </label>

          <div className="relative block">
            <span className={labelClass}>Community Role</span>
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
              <span className="font-medium text-black">{categoryLabel}</span>
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
                className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
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

          <label className="block">
            <span className={labelClass}>Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Mumbai, India"
            />
          </label>
        </div>

        {/* ——— Section: Story & Bio ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
            About & Story
          </h3>

          <label className="block">
            <span className={labelClass}>Tagline / Headline</span>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value.slice(0, 80))}
              className={fieldClass}
              placeholder="e.g. Senior UX Designer & 3D Artist"
            />
            <span className="mt-1 block text-right font-inter text-[10px] text-neutral-400">
              {tagline.length}/80
            </span>
          </label>

          <label className="block">
            <span className={labelClass}>Bio</span>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              className={`${fieldClass} resize-none leading-relaxed`}
              placeholder="Tell the community about your journey and passion..."
            />
            <span className="mt-1 block text-right font-inter text-[10px] text-neutral-400">
              {bio.length}/300
            </span>
          </label>

          <label className="block">
            <span className={labelClass}>Website / Portfolio</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={fieldClass}
              placeholder="https://yourportfolio.com"
              inputMode="url"
            />
          </label>
        </div>

        {/* ——— Section: Skills & Expertise ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
              Skills & Expertise
            </h3>
            <button
              type="button"
              onClick={addSkill}
              className="cursor-pointer font-inter text-xs font-semibold text-[#8B5CF6] transition hover:text-[#7c4feb]"
            >
              + Add Skill
            </button>
          </div>

          {skills.length === 0 ? (
            <p className="font-inter text-xs italic text-neutral-400">No skills added yet.</p>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.id} className="rounded-2xl bg-[#f8f8f8] p-3.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                      placeholder="e.g. Figma / UI Design"
                      className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-2 font-inter text-xs font-medium text-black outline-none ring-1 ring-black/5"
                    />
                    <span className="w-10 text-center font-inter text-xs font-bold text-black">
                      {skill.level}%
                    </span>
                    <button
                      type="button"
                      onClick={() => bumpSkill(skill.id, -5)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white font-bold text-neutral-600 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-100"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => bumpSkill(skill.id, 5)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white font-bold text-neutral-600 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill.id)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white text-red-500 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50"
                      aria-label="Delete skill"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-[#8B5CF6] transition-all"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ——— Section: Work Experience ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
              Work Experience
            </h3>
            <button
              type="button"
              onClick={addExperience}
              className="cursor-pointer font-inter text-xs font-semibold text-[#8B5CF6] transition hover:text-[#7c4feb]"
            >
              + Add Role
            </button>
          </div>

          {experience.length === 0 ? (
            <p className="font-inter text-xs italic text-neutral-400">No experience added yet.</p>
          ) : (
            <div className="space-y-4">
              {experience.map((roleItem, index) => (
                <div
                  key={roleItem.id}
                  className="relative rounded-2xl bg-[#f8f8f8] p-4 ring-1 ring-black/5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Role {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExperience(roleItem.id)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white text-red-500 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50"
                      aria-label="Remove role"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className={labelClass}>Job Title</span>
                      <input
                        value={roleItem.jobTitle}
                        onChange={(e) => updateExperience(roleItem.id, { jobTitle: e.target.value })}
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. Product Designer"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Company</span>
                      <input
                        value={roleItem.company}
                        onChange={(e) => updateExperience(roleItem.id, { company: e.target.value })}
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. Google / Studio"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="block">
                        <span className={labelClass}>Start Year</span>
                        <select
                          value={roleItem.startYear}
                          onChange={(e) =>
                            updateExperience(roleItem.id, { startYear: e.target.value })
                          }
                          className={`${fieldClass} !bg-white`}
                        >
                          <option value="">Year</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className={labelClass}>End Year</span>
                        <select
                          value={roleItem.endYear}
                          disabled={roleItem.isPresent}
                          onChange={(e) => updateExperience(roleItem.id, { endYear: e.target.value })}
                          className={`${fieldClass} !bg-white disabled:opacity-50`}
                        >
                          <option value="">Year / Present</option>
                          <option value="Present">Present</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(roleItem.isPresent || roleItem.endYear === 'Present')}
                        onChange={(e) => {
                          const checked = e.target.checked
                          updateExperience(roleItem.id, {
                            isPresent: checked,
                            endYear: checked ? 'Present' : '',
                          })
                        }}
                        className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                      />
                      <span className="font-inter text-xs text-neutral-600">I currently work here</span>
                    </label>

                    <label className="block">
                      <span className={labelClass}>Description</span>
                      <textarea
                        rows={2}
                        value={roleItem.description}
                        onChange={(e) =>
                          updateExperience(roleItem.id, { description: e.target.value })
                        }
                        className={`${fieldClass} !bg-white resize-none`}
                        placeholder="What were your key projects or responsibilities?"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ——— Section: Education ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
              Education
            </h3>
            <button
              type="button"
              onClick={addEducation}
              className="cursor-pointer font-inter text-xs font-semibold text-[#8B5CF6] transition hover:text-[#7c4feb]"
            >
              + Add Education
            </button>
          </div>

          {education.length === 0 ? (
            <p className="font-inter text-xs italic text-neutral-400">No education added yet.</p>
          ) : (
            <div className="space-y-4">
              {education.map((eduItem, index) => (
                <div
                  key={eduItem.id}
                  className="relative rounded-2xl bg-[#f8f8f8] p-4 ring-1 ring-black/5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-inter text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Education {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(eduItem.id)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white text-red-500 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50"
                      aria-label="Remove education"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block">
                      <span className={labelClass}>Degree / Qualification</span>
                      <input
                        value={eduItem.degree}
                        onChange={(e) => updateEducation(eduItem.id, { degree: e.target.value })}
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. Bachelor of Design"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Institution / University</span>
                      <input
                        value={eduItem.institution}
                        onChange={(e) =>
                          updateEducation(eduItem.id, { institution: e.target.value })
                        }
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. National Institute of Design"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Field of Study</span>
                      <input
                        value={eduItem.field}
                        onChange={(e) => updateEducation(eduItem.id, { field: e.target.value })}
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. Visual Communication"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Date Range</span>
                      <input
                        value={eduItem.dateRange}
                        onChange={(e) => updateEducation(eduItem.id, { dateRange: e.target.value })}
                        className={`${fieldClass} !bg-white`}
                        placeholder="e.g. 2020 - 2024"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(eduItem.currentlyStudying)}
                        onChange={(e) =>
                          updateEducation(eduItem.id, { currentlyStudying: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                      />
                      <span className="font-inter text-xs text-neutral-600">I currently study here</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ——— Section: Social Links & Hubs ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
              Social Links & Hubs
            </h3>
            <button
              type="button"
              onClick={addCustomLink}
              className="cursor-pointer font-inter text-xs font-semibold text-[#8B5CF6] transition hover:text-[#7c4feb]"
            >
              + Add Custom Link
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className={labelClass}>Dribbble</span>
              <input
                value={hubs.dribbble?.url || ''}
                onChange={(e) =>
                  setHubs((prev) => ({
                    ...prev,
                    dribbble: { enabled: true, title: 'Dribbble', url: e.target.value },
                  }))
                }
                className={fieldClass}
                placeholder="dribbble.com/username"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Behance</span>
              <input
                value={hubs.behance?.url || ''}
                onChange={(e) =>
                  setHubs((prev) => ({
                    ...prev,
                    behance: { enabled: true, title: 'Behance', url: e.target.value },
                  }))
                }
                className={fieldClass}
                placeholder="behance.net/username"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Twitter / X</span>
              <input
                value={hubs.twitter?.url || ''}
                onChange={(e) =>
                  setHubs((prev) => ({
                    ...prev,
                    twitter: { enabled: true, title: 'Twitter', url: e.target.value },
                  }))
                }
                className={fieldClass}
                placeholder="x.com/username"
              />
            </label>

            {customLinks.map((custom) => (
              <div key={custom.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={custom.title}
                  onChange={(e) => updateCustomLink(custom.id, { title: e.target.value })}
                  placeholder="Platform / Label"
                  className="w-1/3 rounded-2xl border-0 bg-[#f3f3f3] px-3 py-3 font-inter text-xs text-black outline-none focus:ring-2 focus:ring-black/15"
                />
                <input
                  type="url"
                  value={custom.url}
                  onChange={(e) => updateCustomLink(custom.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded-2xl border-0 bg-[#f3f3f3] px-3 py-3 font-inter text-xs text-black outline-none focus:ring-2 focus:ring-black/15"
                />
                <button
                  type="button"
                  onClick={() => removeCustomLink(custom.id)}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-neutral-100 text-red-500 transition hover:bg-red-50"
                  aria-label="Remove link"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ——— Section: Private Information ——— */}
        <div className="space-y-4 border-t border-neutral-100 pt-5">
          <h3 className="font-inter text-xs font-bold uppercase tracking-wider text-neutral-400">
            Private Information
          </h3>

          <label className="block">
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

          <label className="block">
            <span className={labelClass}>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 16))
              }
              className={fieldClass}
              placeholder="9876543210"
              autoComplete="tel"
            />
          </label>

          <div className="relative block">
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
              <span className="font-medium text-black">{genderLabel}</span>
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
                className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5"
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

        {error ? (
          <div className="rounded-xl bg-red-50 p-3 text-center" role="alert">
            <p className="font-inter text-xs font-semibold text-red-600">{error}</p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-xl border border-neutral-300 bg-white py-3.5 font-inter text-sm font-semibold text-black transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer rounded-xl bg-black py-3.5 font-inter text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
