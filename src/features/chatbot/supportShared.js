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

export const MAX_CHAT_IMAGES = 5
export const MAX_CHAT_VIDEOS = 2

const ALLOWED_MIME =
  /^(image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|webm|quicktime|x-msvideo))$/i
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|mp4|webm|mov|m4v)$/i

export function isAllowedChatMediaFile(file) {
  if (!file || typeof file !== 'object') return false
  const base = (file.type || '').split(';')[0].trim()
  if (base && ALLOWED_MIME.test(base)) return true
  if (!file.type && typeof file.name === 'string' && ALLOWED_EXT.test(file.name)) return true
  return false
}

export function isVideoFile(file) {
  if (!file) return false
  if (file.type && file.type.startsWith('video/')) return true
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || '')
}

export function splitFilesByKind(files) {
  const images = []
  const videos = []
  for (const file of files || []) {
    if (!file || !isAllowedChatMediaFile(file)) continue
    if (isVideoFile(file)) videos.push(file)
    else images.push(file)
  }
  return { images, videos }
}

export function revokeObjectUrls(items) {
  for (const item of items || []) {
    try {
      if (item?.url) URL.revokeObjectURL(item.url)
    } catch {
      /* ignore */
    }
  }
}

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
