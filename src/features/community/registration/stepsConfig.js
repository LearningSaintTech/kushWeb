export const TOTAL_STEPS = 8

export const INITIAL_FORM_DATA = {
  fullName: '',
  username: '',
  location: '',
  coverImage: null,
  coverPreview: '',
  profilePhoto: null,
  profilePreview: '',
  skills: [{ id: '1', name: '', level: 50 }],
  experience: [
    {
      id: '1',
      jobTitle: '',
      company: '',
      startYear: '',
      endYear: '',
      description: '',
    },
  ],
  education: [
    {
      id: '1',
      degree: '',
      institution: '',
      field: '',
      dateRange: '',
      currentlyStudying: false,
    },
  ],
  bio: '',
  tags: '',
  hubs: {
    dribbble: { enabled: false, title: 'Dribbble', url: '' },
    behance: { enabled: false, title: 'Behance', url: '' },
    twitter: { enabled: false, title: 'Twitter', url: '' },
    website: { enabled: false, title: 'Website', url: '' },
  },
  customLinks: [],
}

export const STEPS = [
  {
    id: 1,
    title: 'The Essentials',
    subtitle: "Let's start with how you'll be seen in the community.",
  },
  {
    id: 2,
    title: 'Set the Scene',
    subtitle: 'A face behind the work builds trust.',
  },
  {
    id: 3,
    title: 'Skills & Expertise',
    subtitle: 'Add your skills and rate your proficiency.',
  },
  {
    id: 4,
    title: 'Work Experience',
    subtitle: 'Tell us about your current or most recent role.',
  },
  {
    id: 5,
    title: 'Your Education',
    subtitle: 'Tell us about your academic background.',
  },
  {
    id: 6,
    title: 'Your Story',
    subtitle: 'Share a short bio so the community can know you.',
  },
  {
    id: 7,
    title: 'The Work',
    subtitle: 'Connect your hubs to show off your process.',
  },
  {
    id: 8,
    title: 'Your Profile is Created',
    subtitle:
      "Your profile is pending approval from an admin. We'll review it shortly.",
  },
]

function filled(value) {
  return Boolean(String(value ?? '').trim())
}

export function validateStep(step, data) {
  switch (step) {
    case 1: {
      const name = String(data.fullName || '').trim()
      const username = String(data.username || '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase()
      if (!name) return 'Full name is required.'
      if (!/^[A-Za-z][A-Za-z ]+$/.test(name) || name.length < 2) {
        return 'Name must be at least 2 letters (A–Z and spaces only).'
      }
      if (!username) return 'Username is required.'
      if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) {
        return 'Username must be 3–20 chars, start with a letter, and use only a–z, 0–9, _.'
      }
      return null
    }
    case 2:
      if (!(data.profilePhoto instanceof File) && !data.profilePreview) {
        return 'Please add a profile photo.'
      }
      return null
    case 3: {
      const skills = (data.skills || []).filter((s) => filled(s?.name))
      if (!skills.length) return 'Add at least one skill.'
      return null
    }
    case 4: {
      const rows = (data.experience || []).filter(
        (r) => filled(r?.jobTitle) || filled(r?.company) || filled(r?.description),
      )
      if (!rows.length) return 'Add your work experience (job title and company).'
      if (rows.some((r) => !filled(r?.jobTitle))) return 'Job title is required.'
      if (rows.some((r) => !filled(r?.company))) return 'Company is required.'
      return null
    }
    case 5: {
      const rows = (data.education || []).filter(
        (e) => filled(e?.degree) || filled(e?.institution) || filled(e?.field),
      )
      if (!rows.length) return 'Add your education (degree and institution).'
      if (rows.some((e) => !filled(e?.degree))) return 'Degree / qualification is required.'
      if (rows.some((e) => !filled(e?.institution))) return 'Institution is required.'
      return null
    }
    case 6:
      if (!filled(data.bio)) return 'Bio is required.'
      return null
    case 7: {
      const hubs = Object.values(data.hubs || {})
      if (hubs.some((h) => h?.enabled && !filled(h?.url))) {
        return 'Add a link for each turned-on hub, or turn it off.'
      }
      const hasHub = hubs.some((h) => h?.enabled && filled(h?.url))
      const hasCustom = (data.customLinks || []).some((l) => filled(l?.url))
      if (!hasHub && !hasCustom) return 'Add at least one link to your work.'
      return null
    }
    case 8:
      return null
    default:
      return null
  }
}
