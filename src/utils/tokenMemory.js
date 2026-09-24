/**
 * Access token storage:
 * - memory (fast path for requests)
 * - sessionStorage + localStorage (survives F5 / reload in this browser)
 *
 * Refresh token stays in refreshTokenStore (localStorage + sessionStorage).
 */

const ACCESS_SESSION_KEY = 'khush_web_at';
const ACCESS_LOCAL_KEY = 'khush_web_at_ls';

let memoryToken = null;
const listeners = new Set();

function notify() {
  const token = memoryToken;
  listeners.forEach((fn) => {
    try {
      fn(token);
    } catch {
      /* ignore */
    }
  });
}

function readKey(storage, key) {
  try {
    if (typeof window === 'undefined' || !storage) return null;
    const v = storage.getItem(key);
    return v && v.length > 20 ? v : null;
  } catch {
    return null;
  }
}

function readPersistedAccessToken() {
  const fromSession = readKey(sessionStorage, ACCESS_SESSION_KEY);
  if (fromSession) return fromSession;
  const fromLocal = readKey(localStorage, ACCESS_LOCAL_KEY);
  if (fromLocal) {
    try {
      sessionStorage.setItem(ACCESS_SESSION_KEY, fromLocal);
    } catch {
      /* ignore */
    }
    return fromLocal;
  }
  return null;
}

function writePersistedAccessToken(token) {
  try {
    if (typeof window === 'undefined') return;
    const v = token == null ? '' : String(token).trim();
    if (!v) {
      sessionStorage.removeItem(ACCESS_SESSION_KEY);
      localStorage.removeItem(ACCESS_LOCAL_KEY);
      return;
    }
    sessionStorage.setItem(ACCESS_SESSION_KEY, v);
    localStorage.setItem(ACCESS_LOCAL_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Hydrate memory from session/local storage (call once on app boot). */
export function hydrateMemoryTokenFromSession() {
  if (memoryToken) return memoryToken;
  const stored = readPersistedAccessToken();
  if (stored) {
    memoryToken = stored;
  }
  return memoryToken;
}

export function getMemoryToken() {
  return memoryToken || readPersistedAccessToken();
}

export function setMemoryToken(token) {
  memoryToken = token || null;
  writePersistedAccessToken(memoryToken);
  notify();
}

export function clearMemoryToken() {
  memoryToken = null;
  writePersistedAccessToken(null);
  notify();
}

export function subscribeMemoryToken(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}
