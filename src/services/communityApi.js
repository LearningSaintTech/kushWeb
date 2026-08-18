/**
 * Shared Community API helpers — unwrap, wrap, errors, logging.
 * All community HTTP goes through these so logs stay centralized.
 *
 * Dev: logs when logging is enabled (see utils/logLevel.js / VITE_DEBUG).
 * Tag: [Community]
 */

import { debugLog, debugError, debugWarn } from '../utils/debugLog.js';
import { redactForLog } from '../utils/logRedact.util.js';

export const COMMUNITY_BASE = '/community';

export function unwrapCommunity(res) {
  return res?.data?.data ?? res?.data ?? null;
}

export function getCommunityErrorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  const msg = data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  const errors = data?.errors;
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0];
    const detail =
      (typeof first === 'string' && first) ||
      first?.message ||
      first?.msg ||
      (first?.path && first?.message) ||
      null;
    if (detail) return String(detail).trim();
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();
  return fallback;
}

/** True when create is blocked because designer is not verified. */
export function isDesignerNotVerifiedError(err) {
  const code = err?.response?.data?.code ?? err?.response?.data?.errorCode;
  const msg = String(err?.response?.data?.message ?? '');
  return (
    code === 'DESIGNER_NOT_VERIFIED' ||
    /DESIGNER_NOT_VERIFIED/i.test(msg) ||
    (err?.response?.status === 403 && /designer.*verif/i.test(msg))
  );
}

export function logCommunity(label, payload) {
  debugLog(`[Community] ${label}`, payload !== undefined ? redactForLog(payload) : undefined);
}

export function warnCommunity(label, payload) {
  debugWarn(`[Community] ${label}`, payload !== undefined ? redactForLog(payload) : undefined);
}

/**
 * Wrap an axios promise with request/response/error debug logs.
 * Returns unwrapped `data` (envelope.data).
 */
export function wrapCommunity(method, path, promise, body) {
  logCommunity('request', {
    method,
    path,
    body: body != null ? redactForLog(body) : undefined,
  });
  return promise
    .then((res) => {
      const data = unwrapCommunity(res);
      logCommunity('response', {
        method,
        path,
        status: res?.status,
        message: res?.data?.message,
        data: redactForLog(data),
      });
      return data;
    })
    .catch((err) => {
      debugError(`[Community] error`, {
        method,
        path,
        status: err?.response?.status,
        message: err?.response?.data?.message ?? err?.message,
        code: err?.response?.data?.code ?? err?.response?.data?.errorCode ?? null,
        errors: err?.response?.data?.errors ?? null,
      });
      throw err;
    });
}
