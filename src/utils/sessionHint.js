/** Set after a successful login; cleared on logout. Avoids refresh/logout API calls for anonymous visitors. */
const KEY = 'khush_web_session_hint';

export function setSessionHint() {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearSessionHint() {
  try {
    if (typeof window !== 'undefined') localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSessionHint() {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
