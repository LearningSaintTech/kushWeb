export const ISSUE_TYPES = [
  { value: 'ORDER_ISSUE', label: 'Order issue' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'RETURN', label: 'Return' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'SIZE_ISSUE', label: 'Size issue' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'OTHER', label: 'Other' },
]

export const ORDER_LINKED_ISSUES = new Set([
  'ORDER_ISSUE',
  'DELIVERY',
  'RETURN',
  'EXCHANGE',
  'SIZE_ISSUE',
])

export const ACTIVE_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'])

export function formatChatTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function statusLabel(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
