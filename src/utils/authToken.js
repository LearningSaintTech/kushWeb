/** Decode JWT payload without verifying signature (client UX only; API verifies). */
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Refresh a bit before `exp` so short-lived access tokens don't look like a logout. */
const EXPIRY_SKEW_MS = 20_000;

export function isTokenExpired(token) {
  const decoded = decodeJwtPayload(token);
  if (!decoded) return true;
  if (!decoded.exp) return false;
  return decoded.exp * 1000 <= Date.now() + EXPIRY_SKEW_MS;
}

export function getValidAccessToken(token) {
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export function decodeTokenUserId(token) {
  const decoded = decodeJwtPayload(token);
  return decoded?.userId ?? decoded?.id ?? null;
}
