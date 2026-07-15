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

/**
 * Clean address phone input from autofill/paste.
 * Strips leading 0s and a leading 91 country code from the start (never trims the end).
 */
export function sanitizeAddressPhoneInput(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  // Remove autofill prefixes from the front: 0… and/or 91…
  let guard = 0
  while (digits.length > 0 && guard < 6) {
    guard += 1
    if (digits.startsWith('0')) {
      digits = digits.slice(1)
      continue
    }
    if (digits.startsWith('91') && digits.length > 10) {
      digits = digits.slice(2)
      continue
    }
    break
  }
  return digits.slice(0, 10)
}

/** 10-digit login/profile phone for pre-filling a new address form. */
export function getLoginPhoneForAddress(user) {
  if (!user || typeof user !== 'object') return ''
  const raw =
    user.phoneNumber ??
    user.phone ??
    user.mobile ??
    user.mobileNumber ??
    ''
  return sanitizeAddressPhoneInput(raw)
}

export function isIndianMobile(value) {
  const mobile = sanitizeAddressPhoneInput(value)
  return /^[6-9]\d{9}$/.test(mobile)
}

/**
 * Validate address/checkout phone when +91 is already shown in the UI.
 * Format-only check (cannot verify if a SIM is "real" without OTP).
 * Returns an error message or null. Does not change digits.
 */
export function getAddressPhoneInputError(value) {
  const digits = sanitizeAddressPhoneInput(value)
  if (!String(value ?? '').replace(/\D/g, '')) return 'Phone number is required.'
  if (!digits) return 'Phone number is required.'
  if (digits.length < 10) {
    return 'Please check the number. It must be exactly 10 digits (without +91).'
  }
  if (digits.startsWith('0')) {
    return 'Please check the number. Do not start with 0 — enter a 10-digit mobile starting with 6–9.'
  }
  if (!/^[6-9]/.test(digits)) {
    return 'Please check the number. Indian mobiles must start with 6, 7, 8, or 9.'
  }
  if (!isIndianMobile(digits)) {
    return 'Please check the number. Enter a valid 10-digit Indian mobile without +91.'
  }
  return null
}

/** True when number is format-valid but starts with 91 (often typed country code by mistake). */
export function shouldConfirmIndianPhoneStartsWith91(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length === 10 && isIndianMobile(digits) && digits.startsWith('91')
}

export const ADDRESS_PHONE_91_CONFIRM_MESSAGE =
  'Please check the number.\n\nIt starts with 91, and +91 is already shown.\n\n• OK = this is your real 10-digit mobile\n• Cancel = go back and enter only the 10-digit number (without 91)'


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
