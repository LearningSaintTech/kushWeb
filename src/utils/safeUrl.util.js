import { ROUTES } from './constants.js';

/** Internal app paths allowed after login (prefix match). */
const ALLOWED_REDIRECT_PREFIXES = [
  ...new Set(
    Object.values(ROUTES)
      .map((r) => String(r).replace(/:[^/]+/g, '').replace(/\/+$/, ''))
      .filter((p) => p && p !== '/'),
  ),
];

/**
 * Sanitize post-login redirect — same-origin path only (no protocol-relative or external URLs).
 */
export function sanitizeInternalRedirect(raw, fallback = ROUTES.HOME) {
  if (!raw || typeof raw !== 'string') return fallback;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return fallback;
  const lower = path.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return fallback;

  const pathOnly = path.split('?')[0].split('#')[0];
  if (pathOnly === '/') return path;
  const allowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
  return allowed ? path : fallback;
}

/**
 * Safe http(s) URL for user-clickable links and media src from API payloads.
 */
export function getSafeHttpHref(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return parsed.href;
    if (import.meta.env.DEV && parsed.protocol === 'http:') return parsed.href;
    return null;
  } catch {
    return null;
  }
}

const PAYMENT_REDIRECT_HOST_SUFFIXES = ['.nimbbl.com', '.nimbbl.tech'];

/**
 * Allowlist payment-provider redirect URLs (Nimbbl / BNPL).
 */
export function isAllowedPaymentRedirectUrl(url) {
  const safe = getSafeHttpHref(url);
  if (!safe) return false;
  try {
    const host = new URL(safe).hostname.toLowerCase();
    if (host === 'nimbbl.com' || host === 'www.nimbbl.com') return true;
    return PAYMENT_REDIRECT_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/** Navigate to payment redirect only when host is allowlisted. */
export function assignPaymentRedirectUrl(url) {
  if (!isAllowedPaymentRedirectUrl(url)) {
    throw new Error('Payment redirect URL is not from an allowed provider.');
  }
  window.location.href = url;
}

/** Query keys forwarded from Nimbbl return URL to verify API. */
export const NIMBBL_CALLBACK_QUERY_KEYS = [
  'nimbbl_order_id',
  'order_id',
  'nimbbl_transaction_id',
  'transaction_id',
  'nimbbl_signature',
  'signature',
  'status',
  'payment_status',
  'transaction_status',
  'invoice_id',
];

/** Pick only known Nimbbl callback params (drops extraneous query junk). */
export function pickNimbblCallbackQuery(searchParams) {
  const out = {};
  if (!searchParams) return out;
  for (const key of NIMBBL_CALLBACK_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value != null && value !== '') out[key] = value;
  }
  return out;
}
