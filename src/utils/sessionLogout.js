import axios from 'axios';
import { API_BASE_URL, getTunnelBypassHeaders } from '../services/config.js';
import { getOrCreateDeviceId } from './deviceId.js';
import { clearMemoryToken, getMemoryToken } from './tokenMemory.js';
import { clearSessionHint, hasSessionHint } from './sessionHint.js';

const LOGOUT_PATH = '/user/auth/logout';

const logoutClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
    'x-source-platform': 'website',
    ...getTunnelBypassHeaders(),
  },
});

export async function clearServerSession() {
  const token = getMemoryToken();
  if (!token && !hasSessionHint()) return;

  try {
    const headers = { 'x-device-id': getOrCreateDeviceId() };
    if (token) headers.Authorization = `Bearer ${token}`;
    await logoutClient.post(LOGOUT_PATH, {}, {
      headers,
      validateStatus: (status) => status < 500,
    });
  } catch {
    /* still clear client state */
  }
}

export async function performLogout({ server = true } = {}) {
  if (server) await clearServerSession();
  clearSessionHint();
  clearMemoryToken();
}

/** Remove legacy access token from older builds. */
export function clearLegacyAuthStorage() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('khush_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  } catch {
    /* ignore */
  }
}
