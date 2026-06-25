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

export function isTokenExpired(token) {
  const decoded = decodeJwtPayload(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 <= Date.now();
}

export function getValidAccessToken(token) {
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export function decodeTokenUserId(token) {
  const decoded = decodeJwtPayload(token);
  return decoded?.userId ?? decoded?.id ?? null;
}
