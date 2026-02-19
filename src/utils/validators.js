export function isRequired(value) {
  return value != null && String(value).trim().length > 0
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')
}

export function minLength(value, len) {
  return String(value || '').length >= len
}
