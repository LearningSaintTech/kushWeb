/**
 * API configuration – single source for base URL and debug mode.
 * Reads from VITE_* so values are available at build time.
 */

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

/** Debug mode: log requests/responses. Set VITE_DEBUG=true in .env or rely on dev mode. */
function isDebug() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  const { VITE_DEBUG, DEV } = import.meta.env;
  return VITE_DEBUG === 'true' || VITE_DEBUG === true || DEV === true;
}

export { API_BASE_URL, isDebug };
