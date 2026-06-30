export const RATE_LIMIT_MESSAGE =
  'Too many attempts. Please wait a few minutes and try again.';

export const INVALID_OTP_MESSAGE = 'Invalid OTP';

const GENERIC_AXIOS_MESSAGE = /^request failed with status code \d{3}$/i;

export function isRateLimitedStatus(status) {
  return status === 429;
}

export function isGenericAxiosErrorMessage(message) {
  return GENERIC_AXIOS_MESSAGE.test(String(message || '').trim());
}

/** User-facing message from an API/axios error; skips generic axios text. */
export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data
  const candidates = [
    data?.message,
    data?.error,
    typeof data === 'string' ? data : null,
    Array.isArray(data?.errors) ? data.errors[0]?.message ?? data.errors[0] : null,
    err?.message,
  ]

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim()
    if (!text || isGenericAxiosErrorMessage(text)) continue
    return normalizeRateLimitMessage(text, err?.response?.status)
  }

  return normalizeRateLimitMessage(fallback, err?.response?.status)
}

/** OTP verify failures — prefer API text, else Invalid OTP for 4xx auth errors. */
export function getOtpVerifyErrorMessage(err) {
  const status = err?.response?.status
  const fromApi = getApiErrorMessage(err, '')
  if (fromApi && fromApi !== '') return fromApi
  if (status === 400 || status === 401 || status === 403 || status === 422) {
    return INVALID_OTP_MESSAGE
  }
  return INVALID_OTP_MESSAGE
}

export function normalizeRateLimitMessage(message, status) {
  const text = String(message || '').toLowerCase();
  if (status === 429 || text.includes('429') || text.includes('too many')) {
    return RATE_LIMIT_MESSAGE;
  }
  return message;
}
