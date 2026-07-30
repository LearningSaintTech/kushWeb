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
    case 1:
      if (!data.fullName.trim()) return 'Full name is required.'
      if (!data.username.trim()) return 'Username is required.'
      return null
    case 8:
      return null
    default:
      return null
  }
}
