/**
 * User auth API – register, OTP, login, refresh, profile.
 * Base path: /user/auth
 */

import client from './axiosClient.js';

const BASE = '/user/auth';

function logAuthReq(method, url, body = null) {
  console.log('[Auth API] Request', { method, url, body: body ?? undefined });
}
function logAuthRes(method, url, data) {
  console.log('[Auth API] Response', { method, url, data });
}
function logAuthErr(method, url, err) {
  console.log('[Auth API] Error', { method, url, message: err?.message, response: err?.response?.data });
}

export const authService = {
  register: (body) => {
    const url = `${BASE}/register`;
    logAuthReq('POST', url, body);
    return client.post(url, body).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  verifyOtp: (body) => {
    const url = `${BASE}/verify-otp`;
    logAuthReq('POST', url, body);
    return client.post(url, body).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  resendOtp: (body) => {
    const url = `${BASE}/resend-otp`;
    logAuthReq('POST', url, body);
    return client.post(url, body).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  login: (body) => {
    const url = `${BASE}/login`;
    logAuthReq('POST', url, body);
    return client.post(url, body).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  newAccessToken: (body) => {
    const url = `${BASE}/newAccessToken`;
    logAuthReq('POST', url, body ?? {});
    return client.post(url, body).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  logout: () => {
    const url = `${BASE}/logout`;
    logAuthReq('POST', url, null);
    return client.post(url).then((res) => {
      logAuthRes('POST', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('POST', url, err);
      throw err;
    });
  },

  updateProfile: (data) => {
    const url = `${BASE}/update-profile`;
    logAuthReq('PUT', url, data instanceof FormData ? '(FormData)' : data);
    return client.put(url, data, {
      headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    }).then((res) => {
      logAuthRes('PUT', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('PUT', url, err);
      throw err;
    });
  },

  getProfile: () => {
    const url = `${BASE}/getProfile`;
    logAuthReq('GET', url, null);
    return client.get(url).then((res) => {
      logAuthRes('GET', url, res?.data);
      return res;
    }).catch((err) => {
      logAuthErr('GET', url, err);
      throw err;
    });
  },
};
