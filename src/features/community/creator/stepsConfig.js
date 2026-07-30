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
    case 2:
      if (!data.fullName.trim()) return 'Name is required.'
      if (!data.username.trim()) return 'Username is required.'
      return null
    case 4:
      if (!data.email.trim()) return 'Email is required.'
      return null
    default:
      return null
  }
}
