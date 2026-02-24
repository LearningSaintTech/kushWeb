/**
 * Axios client with interceptors:
 * - Request: add Authorization header when token is present
 * - Response: debug logging (request/response); 401 handling hook for refresh
 */

import axios from 'axios';
import { API_BASE_URL, isDebug } from './config.js';

/** Storage key for access token (align with auth layer). */
export const ACCESS_TOKEN_KEY = 'khush_access_token';

/**
 * Get current access token (e.g. from localStorage or auth context).
 * Override by setting axiosClient.getAccessToken before first request.
 */
let getAccessToken = () => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  } catch {
    return null;
  }
};

/**
 * Set a custom token getter (e.g. from React context).
 * @param {() => string | null} fn
 */
export function setAccessTokenGetter(fn) {
  getAccessToken = typeof fn === 'function' ? fn : () => null;
}

/**
 * Optional: called when response is 401 (e.g. to refresh token or redirect).
 * Set via setOnUnauthorized to plug in refresh logic.
 */
let onUnauthorized = () => {};

export function setOnUnauthorized(fn) {
  onUnauthorized = typeof fn === 'function' ? fn : () => {};
}

const DEVICE_ID_KEY = 'khush_device_id';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// ----- Request interceptor: auth header + debug log -----
client.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      const deviceId = typeof window !== 'undefined' ? window.localStorage?.getItem(DEVICE_ID_KEY) : null;
      if (deviceId) config.headers['x-device-id'] = deviceId;
    } catch {}

    // Let browser set Content-Type (with boundary) for FormData
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    if (isDebug()) {
      const method = (config.method || 'get').toUpperCase();
      const url = config.baseURL && config.url ? `${config.baseURL.replace(/\/$/, '')}${config.url}` : config.url;
      const payload = { method, url, params: config.params };
      if (config.data && method !== 'GET') payload.body = config.data;
      console.debug('[API Request]', payload);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ----- Response interceptor: debug log + 401 handling -----
client.interceptors.response.use(
  (response) => {
    if (isDebug()) {
      const method = (response.config?.method || 'get').toUpperCase();
      const url = response.config?.url ?? '';
      console.debug('[API Response]', {
        method,
        url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    const response = error.response;
    const status = response?.status;
    const config = response?.config;

    if (isDebug()) {
      console.debug('[API Error]', {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        status,
        data: response?.data,
        message: error.message,
      });
    }

    if (status === 401) {
      onUnauthorized(response, error);
    }

    return Promise.reject(error);
  }
);

export default client;
