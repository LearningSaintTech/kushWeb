/**
 * User auth API – register, OTP, login, refresh, profile.
 * Base path: /user/auth
 */

import client from './axiosClient.js';
import { debugLog } from '../utils/debugLog.js';

const BASE = '/user/auth';

function redactAuthBody(body) {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...body };
  if ('otp' in copy) copy.otp = '[redacted]';
  return copy;
}

function redactAuthResponse(data) {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...data };
  const inner = copy.data && typeof copy.data === 'object' ? { ...copy.data } : null;
  if (inner?.accessToken) inner.accessToken = '[redacted]';
  if (inner?.access_token) inner.access_token = '[redacted]';
  if (inner?.refreshToken) inner.refreshToken = '[redacted]';
  if (inner?.refereshToken) inner.refereshToken = '[redacted]';
  if (inner?.newRefreshToken) inner.newRefreshToken = '[redacted]';
  if (copy.accessToken) copy.accessToken = '[redacted]';
  if (copy.access_token) copy.access_token = '[redacted]';
  if (copy.refreshToken) copy.refreshToken = '[redacted]';
  if (copy.refereshToken) copy.refereshToken = '[redacted]';
  if (copy.newRefreshToken) copy.newRefreshToken = '[redacted]';
  if (inner) copy.data = inner;
  return copy;
}

function logAuthDebug(label, payload) {
  debugLog(`[Auth API] ${label}`, payload);
}

function wrapAuthCall(method, url, promise, body = null) {
  logAuthDebug('request', { method, url, body: body ? redactAuthBody(body) : undefined });
  return promise
    .then((res) => {
      logAuthDebug('response', { method, url, data: redactAuthResponse(res?.data) });
      return res;
    })
    .catch((err) => {
      logAuthDebug('error', {
        method,
        url,
        message: err?.message,
        status: err?.response?.status,
      });
      throw err;
    });
}

export const authService = {
  register: (body) =>
    wrapAuthCall('POST', `${BASE}/register`, client.post(`${BASE}/register`, body), body),

  verifyOtp: (body) =>
    wrapAuthCall('POST', `${BASE}/verify-otp`, client.post(`${BASE}/verify-otp`, body), body),

  resendOtp: (body) =>
    wrapAuthCall('POST', `${BASE}/resend-otp`, client.post(`${BASE}/resend-otp`, body), body),

  login: (body) =>
    wrapAuthCall('POST', `${BASE}/login`, client.post(`${BASE}/login`, body), body),

  newAccessToken: () =>
    wrapAuthCall('POST', `${BASE}/newAccessToken`, client.post(`${BASE}/newAccessToken`, {})),

  logout: () => wrapAuthCall('POST', `${BASE}/logout`, client.post(`${BASE}/logout`)),

  updateProfile: (data) =>
    wrapAuthCall(
      'PUT',
      `${BASE}/update-profile`,
      client.put(`${BASE}/update-profile`, data, {
        headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      }),
      data instanceof FormData ? '(FormData)' : data
    ),

  getProfile: () => wrapAuthCall('GET', `${BASE}/getProfile`, client.get(`${BASE}/getProfile`)),
};
