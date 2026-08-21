export const TOTAL_STEPS = 8

export const INITIAL_FORM_DATA = {
  fullName: '',
  username: '',
  location: '',
  coverImage: null,
  coverPreview: '',
  profilePhoto: null,
  profilePreview: '',
  skills: [
    { id: '1', name: 'UI Design', level: 95 },
    { id: '2', name: 'Brand Identity', level: 80 },
  ],
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
    dribbble: { enabled: true, title: 'Dribbble', url: 'dribbble.com/ariverton' },
    behance: { enabled: true, title: 'Behance', url: 'behance.net/ariverton' },
    twitter: { enabled: false, title: 'Twitter', url: 'twitter.com/ariverton' },
    website: { enabled: true, title: 'Website', url: 'ariverton.design' },
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
    case 8:
      return null
    default:
      return null
  }
}
