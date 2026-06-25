import { decodeTokenUserId } from './authToken.js';

export function unwrapApiData(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/** Normalize user id from register/login/verify API payloads. */
export function extractAuthUserId(data) {
  if (!data || typeof data !== 'object') return null;
  const id =
    data.userId ??
    data.user?._id ??
    data.user?.id ??
    data.user?.userId ??
    data._id ??
    data.id ??
    null;
  return id != null ? String(id) : null;
}

/** User object returned directly on verify/register responses, if any. */
export function extractAuthUser(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.user && typeof data.user === 'object') return data.user;
  if (data.name || data.email || data.profileImage || data.phoneNumber) {
    return data;
  }
  return null;
}

export function buildMinimalUser(token, overrides = {}) {
  const id = decodeTokenUserId(token);
  if (!id && !overrides.name) return null;
  return {
    _id: id,
    id,
    userId: id,
    ...overrides,
  };
}

function isRetryableProfileError(err) {
  const status = err?.response?.status;
  const message = String(err?.response?.data?.message ?? err?.message ?? '');
  return status === 404 || status === 503 || /not found/i.test(message);
}

/** New accounts can take a moment before getProfile succeeds. */
export async function fetchUserProfileWithRetry(getProfileFn, options = {}) {
  const { attempts = 4, delayMs = 400 } = options;
  let lastError = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await getProfileFn();
      const data = unwrapApiData(res);
      if (data) return data;
    } catch (err) {
      lastError = err;
      if (!isRetryableProfileError(err) || i >= attempts - 1) break;
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs * (i + 1));
      });
    }
  }

  if (lastError) throw lastError;
  return null;
}

export function isProfileNotFoundError(err) {
  return isRetryableProfileError(err);
}
