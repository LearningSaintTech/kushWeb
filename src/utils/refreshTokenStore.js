/**
 * Web fallback for refresh token when the httpOnly cookie is missing
 * (blocked third-party cookies, stale SameSite=Lax login, or local Vite quirks).
 * Prefer the cookie when present; auth accepts body `refreshToken` as well.
 * sessionStorage — cleared on tab close; not long-term localStorage.
 */
const KEY = 'khush_web_rt';

export function getStoredRefreshToken() {
  try {
    if (typeof window === 'undefined') return null;
    const v = sessionStorage.getItem(KEY);
    return v && v.length > 20 ? v : null;
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token) {
  try {
    if (typeof window === 'undefined') return;
    const v = token == null ? '' : String(token).trim();
    if (!v) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}

export function clearStoredRefreshToken() {
  try {
    if (typeof window !== 'undefined') sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
