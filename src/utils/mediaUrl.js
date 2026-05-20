/**
 * Detect video vs image for product/review media URLs and API objects.
 */

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

export function isVideoUrlString(url) {
  if (!url || typeof url !== "string") return false;
  return VIDEO_EXT_RE.test(url);
}

/**
 * @param {string|{ url?: string, type?: string }} entry
 */
export function isVideoMediaEntry(entry) {
  if (!entry) return false;
  if (typeof entry === "object" && entry.type) {
    const t = String(entry.type).toLowerCase();
    if (t === "video") return true;
    if (t === "image") return false;
  }
  const url = typeof entry === "string" ? entry : entry?.url;
  return isVideoUrlString(url);
}

/**
 * @param {string|{ url?: string }} entry
 */
export function getUrlFromMediaEntry(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry?.url ?? "";
}
