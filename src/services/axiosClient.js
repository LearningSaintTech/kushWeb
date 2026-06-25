/**
 * Axios client: Bearer access token (memory), httpOnly refresh cookie, silent refresh on 401.
 */

import axios from 'axios';
import { debugLog } from '../utils/debugLog.js';
import { redactForLog } from '../utils/logRedact.util.js';
import { API_BASE_URL } from './config.js';
import { refreshUserAccessToken } from '../utils/authSession.js';
import { performLogout } from '../utils/sessionLogout.js';
import { getMemoryToken, setMemoryToken } from '../utils/tokenMemory.js';
import { getOrCreateDeviceId } from '../utils/deviceId.js';
import {
  isRateLimitedStatus,
  normalizeRateLimitMessage,
  RATE_LIMIT_MESSAGE,
} from '../utils/apiErrors.js';

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

let refreshPromise = null;

function isAuthRequestUrl(url = '') {
  return (
    /\/user\/auth\/(login|register|verify-otp|resend-otp|newAccessToken|logout)/i.test(url)
  );
}

/** Public storefront reads — must not trigger token refresh or logout on 401. */
function isPublicApiUrl(url = '') {
  return /\/gift-card\/rules\/active$/i.test(String(url || ''));
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
  },
  timeout: 30000,
  withCredentials: true,
});

client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const deviceId = getOrCreateDeviceId();
    if (deviceId) {
      config.headers['x-device-id'] = deviceId;
    }
    config.headers['x-client-channel'] = 'website';

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
    return response;
  },
  async (error) => {
    const response = error.response;
    const status = response?.status;
    const originalConfig = error.config;

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
    }

    return Promise.reject(error);
  }
);

export default client;
