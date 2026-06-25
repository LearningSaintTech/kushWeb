/** Backend API origin — set via VITE_API_URL in .env (see .env.example). */
import { isLoggingEnabled } from "../utils/logLevel.js";

function envTrim(key) {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.[key] != null
      ? String(import.meta.env[key]).trim()
      : "";
  return raw;
}

/**
 * Local Express runs HTTP; `https://localhost` causes ERR_SSL_PROTOCOL_ERROR.
 * In dev, coerce https → http for loopback only.
 */
function normalizeDevApiOrigin(url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim().replace(/\/$/, "").replace(/\/api\/?$/, "");
  if (!import.meta.env.DEV) return t;
  if (/^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(t)) {
    return t.replace(/^https:/i, "http:");
  }
  return t;
}

function resolveApiOrigin() {
  const fromEnv = normalizeDevApiOrigin(envTrim("VITE_API_URL"));
  if (fromEnv) return fromEnv;
  if (import.meta.env?.DEV) {
    console.warn("[kushWeb] VITE_API_URL is not set. Add it to .env.");
  }
  return "";
}

/** Vite mode: development | staging | production */
const BUILD_MODE = import.meta.env.MODE;

const API_ORIGIN = resolveApiOrigin();
const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : "";

/** Public base URL for assets (images). Use CloudFront or API so Razorpay/iframes never request localhost. */
const ASSET_BASE_URL = (envTrim("VITE_ASSET_URL") || API_ORIGIN || "").replace(
  /\/$/,
  "",
);

/** Socket host (no /api suffix) — same origin as VITE_API_URL. */
function getSocketUrl() {
  return API_ORIGIN;
}

/** @deprecated Use isLoggingEnabled() from utils/logLevel.js — kept for analytics imports. */
function isDebug() {
  return isLoggingEnabled();
}

/** Call once at app boot — warns when release build has no explicit API URL. */
function warnIfProductionApiUrlMissing() {
  if (!import.meta.env.PROD) return;
  if (!envTrim("VITE_API_URL")) {
    console.warn(
      `[kushWeb] VITE_API_URL is not set for ${BUILD_MODE} build; API and socket calls will fail.`,
    );
  }
}

/**
 * Return a public image URL. Avoids localhost so Razorpay checkout (origin api.razorpay.com)
 * can load images without "Private Network Access" / CORS loopback errors.
 * - If url is already absolute and not localhost, return as-is.
 * - If url is relative or localhost, resolve against ASSET_BASE_URL.
 */
function getPublicImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  const isRelative = u.startsWith("/") && !u.startsWith("//");
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u);
  if (isRelative || isLocalhost) {
    if (!ASSET_BASE_URL) return u;
    const path = isRelative ? u : u.replace(/^https?:\/\/[^/]+/, "") || "/";
    return `${ASSET_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return u;
}

export {
  API_ORIGIN,
  API_BASE_URL,
  BUILD_MODE,
  getSocketUrl,
  isDebug,
  getPublicImageUrl,
  ASSET_BASE_URL,
  warnIfProductionApiUrlMissing,
};
