const API_BASE_URL = import.meta.env.VITE_API_URL + "/api";
/** Public base URL for assets (images). Use CloudFront or API so Razorpay/iframes never request localhost. */
const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function isDebug() {
  const { VITE_DEBUG, DEV } = import.meta.env;
  return VITE_DEBUG === "true" || DEV === true;
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

export { API_BASE_URL, isDebug, getPublicImageUrl, ASSET_BASE_URL };