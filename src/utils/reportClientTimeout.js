/**
 * Report Axios "timeout exceeded" to backend (fetch — avoids axios recursion).
 */
import { API_BASE_URL, getTunnelBypassHeaders } from "../services/config.js";
import { getCurrentAccessToken } from "../services/axiosClient.js";
import { getOrCreateDeviceId } from "../utils/deviceId.js";

const REPORT_PATH = "/client-errors/timeout";
const recentKeys = new Map();
const DEDUPE_MS = 15_000;

export function isAxiosTimeoutError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || error || "");
  return (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    /timeout of \d+ms exceeded/i.test(message) ||
    /timeout.*exceeded/i.test(message)
  );
}

function buildApiPath(config) {
  if (!config) return "";
  const base = String(config.baseURL || "").replace(/\/$/, "");
  const url = String(config.url || "");
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function shouldSkip(apiPath) {
  return /client-errors\/timeout/i.test(apiPath) || /\/analytics\/events/i.test(apiPath);
}

/**
 * Fire-and-forget timeout report. Never throws.
 */
export function reportClientTimeout(error, { client = "website" } = {}) {
  try {
    if (typeof window === "undefined" || !error || !isAxiosTimeoutError(error)) return;
    const config = error.config || {};
    const apiPath = buildApiPath(config).slice(0, 500);
    if (!apiPath || shouldSkip(apiPath)) return;

    const timeoutMs = Number(config.timeout) || null;
    const dedupeKey = `${client}|${(config.method || "get").toUpperCase()}|${apiPath}|${timeoutMs}`;
    const now = Date.now();
    const last = recentKeys.get(dedupeKey) || 0;
    if (now - last < DEDUPE_MS) return;
    recentKeys.set(dedupeKey, now);
    if (recentKeys.size > 100) {
      for (const [k, t] of recentKeys) {
        if (now - t > DEDUPE_MS) recentKeys.delete(k);
      }
    }

    const startedAt = config.metadata?.startedAt;
    const durationMs =
      typeof startedAt === "number" && Number.isFinite(startedAt)
        ? Math.max(0, now - startedAt)
        : timeoutMs;

    const headers = {
      "Content-Type": "application/json",
      "x-client-channel": "website",
      "x-source-platform": "website",
      ...getTunnelBypassHeaders(),
    };
    const token = getCurrentAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    const deviceId = getOrCreateDeviceId?.();
    if (deviceId) headers["x-device-id"] = deviceId;

    const body = {
      client,
      method: (config.method || "GET").toUpperCase(),
      apiPath,
      pageUrl: window.location.href.slice(0, 500),
      timeoutMs,
      durationMs,
      message: String(error.message || "timeout exceeded").slice(0, 500),
      code: error.code || "ECONNABORTED",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : undefined,
      occurredAt: new Date().toISOString(),
    };

    const url = `${String(API_BASE_URL || "").replace(/\/$/, "")}${REPORT_PATH}`;
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the failed request path */
  }
}
