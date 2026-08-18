/** Normalize community / auth user ids for equality checks. */
export function communityUserId(value) {
  if (value == null || value === '') return null
  if (typeof value === 'object') {
    const id = value.userId ?? value._id ?? value.id ?? value.authorId
    return id != null && id !== '' ? String(id) : null
  }
  return String(value)
}

export function isSameCommunityUser(a, b) {
  const left = communityUserId(a)
  const right = communityUserId(b)
  return Boolean(left && right && left === right)
}
