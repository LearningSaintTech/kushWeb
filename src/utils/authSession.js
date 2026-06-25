import axios from 'axios';
import { API_BASE_URL } from '../services/config.js';
import { getOrCreateDeviceId } from './deviceId.js';
import { clearSessionHint, hasSessionHint } from './sessionHint.js';

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-client-channel': 'website',
  },
});

function extractAccessToken(body) {
  const data = body?.data ?? body;
  return data?.accessToken ?? data?.access_token ?? null;
}

/** Exchange httpOnly refresh cookie for a new user access token. */
export async function refreshUserAccessToken() {
  if (!hasSessionHint()) return null;

  const deviceId = getOrCreateDeviceId();
  try {
    const response = await refreshClient.post(
      '/user/auth/newAccessToken',
      {},
      {
        headers: { 'x-device-id': deviceId },
        validateStatus: (status) => status < 500,
      }
    );
    if (response.status === 401) {
      clearSessionHint();
      return null;
    }
    return extractAccessToken(response?.data);
  } catch {
    clearSessionHint();
    return null;
  }
}
