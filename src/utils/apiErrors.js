export const RATE_LIMIT_MESSAGE =
  'Too many attempts. Please wait a few minutes and try again.';

export function isRateLimitedStatus(status) {
  return status === 429;
}

export function normalizeRateLimitMessage(message, status) {
  const text = String(message || '').toLowerCase();
  if (status === 429 || text.includes('429') || text.includes('too many')) {
    return RATE_LIMIT_MESSAGE;
  }
  return message;
}
