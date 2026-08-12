/** Backend API origin — set via VITE_API_URL in .env (see .env.example). */
import { isLoggingEnabled } from "../utils/logLevel.js";

function envTrim(key) {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.[key] != null
      ? String(import.meta.env[key]).trim()
      : "";
  return raw.replace(/^["']|["']$/g, "");
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
/** In dev, use Vite `/api` proxy to avoid browser CORS blocks against the remote API. */
const API_BASE_URL = API_ORIGIN
  ? import.meta.env.DEV
    ? "/api"
    : `${API_ORIGIN}/api`
  : "";

/** Public base URL for assets (images). Use CloudFront or API so Razorpay/iframes never request localhost. */
const ASSET_BASE_URL = (envTrim("VITE_ASSET_URL") || API_ORIGIN || "").replace(
  /\/$/,
  "",
);

/**
 * Socket.IO host (no /api suffix).
 * In DEV, use the page origin so Vite proxies `/socket.io` → VITE_API_URL
 * (direct wss:// to free tunnels like Pinggy often fails).
 */
function getSocketUrl() {
  if (import.meta.env.DEV && API_ORIGIN) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
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
  let u = url.trim();
  if (!u) return "";
  try {
    if (/^https?:\/\//i.test(u)) {
      const parsed = new URL(u);
      parsed.pathname = parsed.pathname
        .split("/")
        .map((segment) => (segment.includes(" ") ? encodeURIComponent(segment) : segment))
        .join("/");
      u = parsed.toString();
    } else if (u.includes(" ")) {
      u = u.replace(/ /g, "%20");
    }
  } catch {
    u = u.replace(/ /g, "%20");
  }
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
