import axios from 'axios';
import { API_BASE_URL, getTunnelBypassHeaders } from '../services/config.js';
import { getOrCreateDeviceId } from './deviceId.js';
import { clearSessionHint, hasSessionHint, setSessionHint } from './sessionHint.js';
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from './refreshTokenStore.js';
import { debugLog, debugWarn } from './debugLog.js';

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    'x-source-platform': 'website',
    ...getTunnelBypassHeaders(),
  },
});

function asObject(value) {
  return value && typeof value === 'object' ? value : null;
}

/** Walk common auth envelope shapes for access / refresh tokens. */
function pickToken(body, keys) {
  const roots = [body, body?.data, body?.data?.data, body?.result, body?.tokens, body?.data?.tokens]
    .map(asObject)
    .filter(Boolean);

  for (const root of roots) {
    for (const key of keys) {
      const value = root[key];
      if (typeof value === 'string' && value.trim().length > 20) {
        return value.trim();
      }
    }
  }
  return null;
}

function extractAccessToken(body) {
  return pickToken(body, [
    'accessToken',
    'access_token',
    'token',
    'jwt',
    'accessJwt',
  ]);
}

function extractRefreshToken(body) {
  return pickToken(body, [
    'refreshToken',
    'refresh_token',
    'newRefreshToken',
    'refereshToken', // API typo seen in older responses
    'refreshJwt',
  ]);
}

/** Persist refresh from login/verify/refresh responses (cookie + body fallback). */
export function rememberRefreshTokenFromAuthPayload(payload) {
  const token = extractRefreshToken(payload);
  if (token) {
    setStoredRefreshToken(token);
    setSessionHint();
    debugLog('[Auth] stored refresh token from auth payload');
  }
}

/**
 * Exchange stored body refresh token (preferred) and/or httpOnly cookie
 * for a new access token. Shared in-flight promise avoids concurrent
 * rotations that invalidate the session on page refresh.
 */
let refreshInFlight = null;

export async function refreshUserAccessToken() {
  const storedRefresh = getStoredRefreshToken();
  // Hit refresh if we have either a session hint or a stored refresh token.
  // (Hint-only still relies on httpOnly cookie via withCredentials.)
  if (!hasSessionHint() && !storedRefresh) {
    debugLog('[Auth] refresh skipped — no session hint and no stored refresh token');
    return null;
  }

  if (refreshInFlight) {
    debugLog('[Auth] refresh joined in-flight request');
    return refreshInFlight;
  }

  const run = (async () => {
    const deviceId = getOrCreateDeviceId();
    const bodyRefresh = getStoredRefreshToken();
    debugLog('[Auth] POST /user/auth/newAccessToken', {
      hasBodyRefresh: Boolean(bodyRefresh),
      hasSessionHint: hasSessionHint(),
    });

    try {
      // When we have a body refresh token, do NOT send cookies. A stale
      // httpOnly refresh cookie can win on the server and 401 a still-valid
      // body token — which was wiping the session on every F5.
      const response = await refreshClient.post(
        '/user/auth/newAccessToken',
        bodyRefresh ? { refreshToken: bodyRefresh } : {},
        {
          headers: { 'x-device-id': deviceId },
          withCredentials: !bodyRefresh,
          validateStatus: (status) => status < 500,
        },
      );

      debugLog('[Auth] newAccessToken response', {
        status: response.status,
        hasAccess: Boolean(extractAccessToken(response?.data)),
        hasRefresh: Boolean(extractRefreshToken(response?.data)),
      });

      if (response.status === 401) {
        // Cookie-only path failed — keep stored body RT if we never sent it.
        if (!bodyRefresh) {
          debugWarn('[Auth] refresh rejected (401) — cookie path, session kept for body RT retry');
          return null;
        }
        debugWarn('[Auth] refresh rejected (401) — clearing local session');
        clearSessionHint();
        clearStoredRefreshToken();
        return null;
      }
      if (response.status === 429) {
        debugWarn('[Auth] refresh rate-limited (429) — keeping session');
        return null;
      }
      if (response.status >= 400) {
        debugWarn('[Auth] refresh soft-failed', { status: response.status });
        return null;
      }

      const nextRefresh = extractRefreshToken(response?.data);
      if (nextRefresh) {
        setStoredRefreshToken(nextRefresh);
        setSessionHint();
      }

      const access = extractAccessToken(response?.data);
      if (access) {
        setSessionHint();
        return access;
      }

      debugWarn('[Auth] refresh 2xx but no accessToken in body', {
        keys: response?.data && typeof response.data === 'object'
          ? Object.keys(response.data)
          : typeof response?.data,
      });
      return null;
    } catch (err) {
      // Network / 5xx — do NOT clear session hint (avoids false auto-logout).
      debugWarn('[Auth] refresh network/error', {
        message: err?.message,
        status: err?.response?.status,
      });
      return null;
    }
  })();

  refreshInFlight = run;
  try {
    return await run;
  } finally {
    if (refreshInFlight === run) refreshInFlight = null;
  }
}
