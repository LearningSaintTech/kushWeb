import axios from 'axios';
import { API_BASE_URL, getTunnelBypassHeaders } from '../services/config.js';
import { getOrCreateDeviceId } from './deviceId.js';
import { clearSessionHint, hasSessionHint } from './sessionHint.js';
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from './refreshTokenStore.js';

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    ...getTunnelBypassHeaders(),
  },
});

function extractAccessToken(body) {
  const data = body?.data ?? body;
  return data?.accessToken ?? data?.access_token ?? null;
}

function extractRefreshToken(body) {
  const data = body?.data ?? body;
  return data?.refreshToken ?? data?.newRefreshToken ?? data?.refereshToken ?? null;
}

/** Persist refresh from login/verify/refresh responses (cookie + body fallback). */
export function rememberRefreshTokenFromAuthPayload(payload) {
  const token = extractRefreshToken(payload);
  if (token) setStoredRefreshToken(token);
}

/** Exchange httpOnly refresh cookie (and/or stored body token) for a new access token. */
export async function refreshUserAccessToken() {
  if (!hasSessionHint()) return null;

  const deviceId = getOrCreateDeviceId();
  const storedRefresh = getStoredRefreshToken();
  try {
    const response = await refreshClient.post(
      '/user/auth/newAccessToken',
      storedRefresh ? { refreshToken: storedRefresh } : {},
      {
        headers: { 'x-device-id': deviceId },
        validateStatus: (status) => status < 500,
      },
    );
    if (response.status === 401) {
      // True session death — cookie/body rejected. Clear local only.
      clearSessionHint();
      clearStoredRefreshToken();
      return null;
    }
    if (response.status === 429) {
      // Rate limited — keep session hint; caller can retry later.
      return null;
    }
    if (response.status >= 400) {
      return null;
    }
    const nextRefresh = extractRefreshToken(response?.data);
    if (nextRefresh) setStoredRefreshToken(nextRefresh);
    return extractAccessToken(response?.data);
  } catch {
    // Network / 5xx — do NOT clear session hint (avoids false auto-logout).
    return null;
  }
}
