export const TOTAL_STEPS = 4
export const SUCCESS_STEP = 5

export const INITIAL_FORM_DATA = {
  photo: null,
  photoPreview: '',
  fullName: '',
  username: '',
  bio: '',
  website: '',
  email: '',
  phone: '',
  gender: '',
}

export const STEPS = [
  { id: 1, title: 'Add Photo', continueLabel: 'Next' },
  { id: 2, title: 'Basic Info', continueLabel: 'Continue' },
  { id: 3, title: 'About You', continueLabel: 'Continue' },
  { id: 4, title: 'Private Info', continueLabel: 'Complete Profile' },
]

export function validateStep(step, data) {
  switch (step) {
    case 1:
      if (!(data.photo instanceof File) && !data.photoPreview) {
        return 'Please add a profile photo.'
      }
      return null
    case 2: {
      const name = String(data.fullName || '').trim()
      const username = String(data.username || '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase()
      if (!name) return 'Name is required.'
      if (!/^[A-Za-z][A-Za-z ]+$/.test(name) || name.length < 2) {
        return 'Name must be at least 2 letters (A–Z and spaces only).'
      }
      if (!username) return 'Username is required.'
      if (!/^[a-z][a-z0-9_]{2,29}$/.test(username)) {
        return 'Username must be 3–30 chars, start with a letter, and use only a–z, 0–9, _.'
      }
      return null
    }
    case 4: {
      const email = String(data.email || '').trim()
      if (!email) return 'Email is required.'
      const phone = String(data.phone || '').replace(/\D/g, '')
      if (phone && !/^[6-9]\d{9}$/.test(phone.slice(-10))) {
        return 'Enter a valid 10-digit Indian mobile number.'
      }
      return null
    }
    default:
      return null
  }
}
