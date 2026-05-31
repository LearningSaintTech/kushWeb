export function isRequired(value) {
  return value != null && String(value).trim().length > 0
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')
}

export function minLength(value, len) {
  return String(value || '').length >= len
}

/** Strip country/leading zero; returns up to last 10 digits for Indian mobiles. */
export function normalizeIndianPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length >= 10) return digits.slice(-10)
  return digits
}

export function isIndianMobile(value) {
  const mobile = normalizeIndianPhone(value)
  return /^[6-9]\d{9}$/.test(mobile)
}

const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  messageMin: 10,
  messageMax: 2000,
  subjectMax: 150,
}

const CONTACT_NAME_PATTERN = /^[\p{L}\p{M}\s.'-]+$/u

/**
 * Validate contact-us form fields.
 * @param {{ name?: string, email?: string, phone?: string, subject?: string, message?: string }} fields
 * @param {{ phoneRequired?: boolean }} [options]
 * @returns {{ valid: boolean, errors: Record<string, string>, values: { name: string, email: string, phone: string, subject: string, message: string } }}
 */
export function validateContactForm(fields, { phoneRequired = false } = {}) {
  const errors = {}
  const name = String(fields?.name ?? '').trim()
  const email = String(fields?.email ?? '').trim()
  const phoneRaw = String(fields?.phone ?? '').trim()
  const subject = String(fields?.subject ?? '').trim()
  const message = String(fields?.message ?? '').trim()

  if (!isRequired(name)) {
    errors.name = 'Name is required.'
  } else if (name.length < CONTACT_LIMITS.nameMin) {
    errors.name = `Name must be at least ${CONTACT_LIMITS.nameMin} characters.`
  } else if (name.length > CONTACT_LIMITS.nameMax) {
    errors.name = `Name must be at most ${CONTACT_LIMITS.nameMax} characters.`
  } else if (!CONTACT_NAME_PATTERN.test(name)) {
    errors.name = "Name can only contain letters, spaces, and . ' -"
  }

  if (!isRequired(email)) {
    errors.email = 'Email is required.'
  } else if (!isEmail(email)) {
    errors.email = 'Enter a valid email address.'
  } else if (email.length > CONTACT_LIMITS.emailMax) {
    errors.email = 'Email is too long.'
  }

  if (phoneRequired && !isRequired(phoneRaw)) {
    errors.phone = 'Phone number is required.'
  } else if (phoneRaw && !isIndianMobile(phoneRaw)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6–9).'
  }

  if (subject.length > CONTACT_LIMITS.subjectMax) {
    errors.subject = `Subject must be at most ${CONTACT_LIMITS.subjectMax} characters.`
  }

  if (!isRequired(message)) {
    errors.message = 'Message is required.'
  } else if (message.length < CONTACT_LIMITS.messageMin) {
    errors.message = `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`
  } else if (message.length > CONTACT_LIMITS.messageMax) {
    errors.message = `Message must be at most ${CONTACT_LIMITS.messageMax} characters.`
  }

  const phone = phoneRaw ? normalizeIndianPhone(phoneRaw) : ''

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { name, email, phone, subject, message },
  }
}

export { CONTACT_LIMITS }
