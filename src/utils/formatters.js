export function formatPrice(value, currency = '₹') {
  if (value == null || isNaN(value)) return ''
  return `${currency}${Number(value).toLocaleString('en-IN')}`
}

export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN')
}
