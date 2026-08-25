/**
 * Axios client: Bearer access token (memory), httpOnly refresh cookie, silent refresh on 401.
 */

import axios from 'axios';
import { debugLog } from '../utils/debugLog.js';
import { redactForLog } from '../utils/logRedact.util.js';
import { API_BASE_URL, getTunnelBypassHeaders } from './config.js';
import { refreshUserAccessToken } from '../utils/authSession.js';
import { performLogout } from '../utils/sessionLogout.js';
import { getMemoryToken, setMemoryToken } from '../utils/tokenMemory.js';
import { getOrCreateDeviceId } from '../utils/deviceId.js';
import {
  isRateLimitedStatus,
  normalizeRateLimitMessage,
  RATE_LIMIT_MESSAGE,
} from '../utils/apiErrors.js';
import { reportClientTimeout } from '../utils/reportClientTimeout.js';

/** @deprecated Legacy key — cleared on boot; do not read or write. */
export const ACCESS_TOKEN_KEY = 'khush_access_token';

let getAccessToken = () => getMemoryToken();

export function setAccessTokenGetter(fn) {
  getAccessToken = typeof fn === 'function' ? fn : () => getMemoryToken();
}

export function getCurrentAccessToken() {
  return getAccessToken();
}

/** @deprecated Use axios 401 interceptor instead. */
export function setOnUnauthorized() {
  /* no-op — kept for API compatibility */
}

/** Called when session is missing/expired and user should sign in again. */
let onAuthRequired = null;

export function setOnAuthRequired(fn) {
  onAuthRequired = typeof fn === 'function' ? fn : null;
}

function notifyAuthRequired() {
  try {
    onAuthRequired?.();
  } catch {
    /* ignore */
  }
}

let refreshPromise = null;

function isAuthRequestUrl(url = '') {
  return (
    /\/user\/auth\/(login|register|verify-otp|resend-otp|newAccessToken|logout)/i.test(url)
  );
}

/** Public storefront reads — must not trigger token refresh or logout on 401. */
function isPublicApiUrl(url = '') {
  return /\/gift-card\/(rules\/active|buy\/preview)|\/gift-items\/getActive/i.test(
    String(url || ''),
  );
}

function looksLikeHtmlPayload(data) {
  if (typeof data !== 'string') return false;
  const head = data.slice(0, 200).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html');
}

async function runTokenRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const token = await refreshUserAccessToken();
    if (token) {
      setMemoryToken(token);
    }
    return token;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    'x-source-platform': 'website',
    ...getTunnelBypassHeaders(),
  },
  timeout: 30000,
  withCredentials: true,
});

client.interceptors.request.use(
  (config) => {
    config.metadata = { ...(config.metadata || {}), startedAt: Date.now() };

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deviceId = getOrCreateDeviceId();
    if (deviceId) {
      config.headers['x-device-id'] = deviceId;
    }
    config.headers['x-client-channel'] = 'website';
    config.headers['x-source-platform'] = 'website';
    Object.entries(getTunnelBypassHeaders()).forEach(([k, v]) => {
      config.headers[k] = v;
    });

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const method = (config.method || 'get').toUpperCase();
    const url =
      config.baseURL && config.url
        ? `${config.baseURL.replace(/\/$/, '')}${config.url}`
        : config.url;
    const payload = { method, url, params: config.params };
    if (config.data && method !== 'GET') payload.body = redactForLog(config.data);
    debugLog('[API Request]', payload);

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || 'get').toUpperCase();
    const url = response.config?.url ?? '';
    debugLog('[API Response]', {
      method,
      url,
      status: response.status,
      data: redactForLog(response.data),
    });

    if (looksLikeHtmlPayload(response.data)) {
      const err = new Error(
        'API returned an HTML page instead of JSON (often a free Pinggy screening page). Restart the tunnel or keep X-Pinggy-No-Screen enabled.',
      );
      err.response = response;
      err.isHtmlApiResponse = true;
      return Promise.reject(err);
    }

    return response;
  },
  async (error) => {
    const response = error.response;
    const status = response?.status;
    const originalConfig = error.config;

    reportClientTimeout(error, { client: 'website' });

    debugLog('[API Error]', {
      method: originalConfig?.method?.toUpperCase(),
      url: originalConfig?.url,
      status,
      data: redactForLog(response?.data),
      message: error.message,
    });

    if (isRateLimitedStatus(status) && response?.data) {
      const data = { ...response.data };
      data.message = RATE_LIMIT_MESSAGE;
      error.response = { ...response, data };
    } else if (response?.data?.message) {
      const data = { ...response.data };
      data.message = normalizeRateLimitMessage(data.message, status);
      error.response = { ...response, data };
    }

    const canRetry =
      status === 401 &&
      originalConfig &&
      !originalConfig._authRetry &&
      !isAuthRequestUrl(originalConfig.url) &&
      !isPublicApiUrl(originalConfig.url);

    if (canRetry) {
      try {
        const newToken = await runTokenRefresh();
        if (newToken) {
          originalConfig._authRetry = true;
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `Bearer ${newToken}`;
          return client(originalConfig);
        }
      } catch {
        /* fall through */
      }
    }

    if (
      status === 401 &&
      originalConfig &&
      !isAuthRequestUrl(originalConfig.url) &&
      !isPublicApiUrl(originalConfig.url)
    ) {
      await performLogout({ server: true });
      notifyAuthRequired();
    }

    return Promise.reject(error);
  }
);

export default client;
