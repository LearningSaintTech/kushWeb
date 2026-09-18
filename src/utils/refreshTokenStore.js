/**
 * Web fallback for refresh token when the httpOnly cookie is missing
 * (blocked third-party cookies, stale SameSite=Lax login, or local Vite quirks).
 * Prefer the cookie when present; auth accepts body `refreshToken` as well.
 * sessionStorage for this tab + localStorage so extra tabs on the same device
 * can refresh without looking logged out.
 */
const SESSION_KEY = 'khush_web_rt';
const LOCAL_KEY = 'khush_web_rt_ls';

function readKey(storage, key) {
  try {
    const v = storage.getItem(key);
    return v && v.length > 20 ? v : null;
  } catch {
    return null;
  }
}

export function getStoredRefreshToken() {
  if (typeof window === 'undefined') return null;
  const fromSession = readKey(sessionStorage, SESSION_KEY);
  if (fromSession) return fromSession;
  const fromLocal = readKey(localStorage, LOCAL_KEY);
  if (fromLocal) {
    try {
      sessionStorage.setItem(SESSION_KEY, fromLocal);
    } catch {
      /* ignore */
    }
    return fromLocal;
  }
  return null;
}

export function setStoredRefreshToken(token) {
  try {
    if (typeof window === 'undefined') return;
    const v = token == null ? '' : String(token).trim();
    if (!v) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOCAL_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, v);
    localStorage.setItem(LOCAL_KEY, v);
  } catch {
    /* ignore */
  }
}

export function clearStoredRefreshToken() {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}
